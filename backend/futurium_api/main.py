from __future__ import annotations

import logging
import shutil
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, File, Form, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse

from .config import Settings
from .errors import ApiError, ProcessingError
from .job_store import FRAME_ID_PATTERN, JobStore, normalize_job_id
from .logging_config import configure_logging
from .models import (
    ErrorDetail,
    ErrorResponse,
    HealthResponse,
    JobError,
    ProcessingManifest,
    ProcessingStatus,
)
from .processing import FrameProcessor

ALLOWED_MEDIA_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-m4v",
}
UPLOAD_CHUNK_BYTES = 1024 * 1024

logger = logging.getLogger("futurium_api")


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    payload = ErrorResponse(error=ErrorDetail(code=code, message=message))
    return JSONResponse(
        status_code=status_code, content=payload.model_dump(by_alias=True)
    )


async def save_bounded_upload(
    upload: UploadFile, destination: Path, max_bytes: int
) -> int:
    total_bytes = 0
    try:
        with destination.open("xb") as output:
            while chunk := await upload.read(UPLOAD_CHUNK_BYTES):
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise ApiError(
                        413,
                        "upload_too_large",
                        f"Video exceeds the {max_bytes // (1024 * 1024)} MiB limit.",
                    )
                output.write(chunk)
    finally:
        await upload.close()

    if total_bytes == 0:
        raise ApiError(400, "empty_upload", "The uploaded video is empty.")
    return total_bytes


def clear_processed_images(job_dir: Path) -> None:
    for directory_name in ("frames", "thumbnails", "sampled"):
        directory = job_dir / directory_name
        if directory.is_dir():
            shutil.rmtree(directory, ignore_errors=True)
            if directory_name != "sampled":
                directory.mkdir(exist_ok=True)


def process_job(
    job_id: str,
    source_path: Path,
    store: JobStore,
    processor: FrameProcessor,
) -> None:
    manifest = store.get(job_id)
    if manifest is None:
        source_path.unlink(missing_ok=True)
        return

    logger.info(
        "sweep_processing_started",
        extra={"job_id": job_id, "sweep_id": manifest.sweep_id},
    )
    try:
        duration, sampled, blur_count, duplicate_count, frames = processor.process(
            job_id, source_path, store.job_dir(job_id)
        )
        manifest.status = ProcessingStatus.READY
        manifest.duration = duration
        manifest.total_frames_sampled = sampled
        manifest.retained_frame_count = len(frames)
        manifest.rejected_blur_count = blur_count
        manifest.rejected_duplicate_count = duplicate_count
        manifest.frames = frames
        manifest.error = None
        store.save(manifest)
        logger.info(
            "sweep_processing_completed",
            extra={
                "job_id": job_id,
                "sweep_id": manifest.sweep_id,
                "status": manifest.status.value,
                "total_frames_sampled": sampled,
                "retained_frame_count": len(frames),
                "rejected_blur_count": blur_count,
                "rejected_duplicate_count": duplicate_count,
            },
        )
    except ProcessingError as error:
        clear_processed_images(store.job_dir(job_id))
        manifest.status = ProcessingStatus.FAILED
        manifest.error = JobError(code=error.code, message=error.message)
        store.save(manifest)
        logger.warning(
            "sweep_processing_failed",
            extra={
                "job_id": job_id,
                "sweep_id": manifest.sweep_id,
                "status": manifest.status.value,
            },
        )
    except Exception:
        clear_processed_images(store.job_dir(job_id))
        manifest.status = ProcessingStatus.FAILED
        manifest.error = JobError(
            code="processing_failed",
            message="The video could not be processed.",
        )
        store.save(manifest)
        logger.error(
            "sweep_processing_failed_unexpectedly",
            extra={
                "job_id": job_id,
                "sweep_id": manifest.sweep_id,
                "status": manifest.status.value,
            },
        )
    finally:
        source_path.unlink(missing_ok=True)


def create_app(settings: Settings | None = None) -> FastAPI:
    configure_logging()
    active_settings = settings or Settings.from_environment()
    store = JobStore(active_settings.data_dir)
    processor = FrameProcessor(active_settings)
    app = FastAPI(
        title="Futurium Processing API",
        version="0.1.0",
        description="Extracts useful frames from saved room sweeps.",
    )

    @app.exception_handler(ApiError)
    async def handle_api_error(_request: Request, error: ApiError) -> JSONResponse:
        return error_response(error.status_code, error.code, error.message)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request, _error: RequestValidationError
    ) -> JSONResponse:
        return error_response(
            422, "validation_error", "The request fields are not valid."
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(
        _request: Request, _error: Exception
    ) -> JSONResponse:
        logger.error("unhandled_request_error")
        return error_response(
            500, "internal_error", "The request could not be completed."
        )

    @app.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        ffmpeg_available = shutil.which("ffmpeg") is not None
        ffprobe_available = shutil.which("ffprobe") is not None
        status = "ok" if ffmpeg_available and ffprobe_available else "degraded"
        return HealthResponse(
            status=status,
            ffmpeg_available=ffmpeg_available,
            ffprobe_available=ffprobe_available,
        )

    @app.post(
        "/sweeps",
        response_model=ProcessingManifest,
        status_code=202,
        responses={400: {"model": ErrorResponse}, 413: {"model": ErrorResponse}},
    )
    async def upload_sweep(
        background_tasks: BackgroundTasks,
        sweep_id: Annotated[int, Form(gt=0)],
        video: Annotated[UploadFile, File()],
    ) -> ProcessingManifest:
        if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
            raise ApiError(
                503,
                "processing_unavailable",
                "FFmpeg and FFprobe are required by the processing service.",
            )

        media_type = (video.content_type or "").lower()
        if media_type not in ALLOWED_MEDIA_TYPES:
            await video.close()
            raise ApiError(
                415,
                "unsupported_media_type",
                "Upload an MP4, MOV, M4V, or WebM video.",
            )

        job_id = str(uuid4())
        manifest = ProcessingManifest(
            job_id=job_id,
            sweep_id=sweep_id,
            status=ProcessingStatus.PROCESSING,
        )
        job_dir = store.create_job(manifest)
        source_path = job_dir / "source.upload"

        try:
            upload_bytes = await save_bounded_upload(
                video, source_path, active_settings.max_upload_bytes
            )
        except Exception:
            store.remove_job(job_id)
            raise

        logger.info(
            "sweep_upload_accepted",
            extra={"job_id": job_id, "sweep_id": sweep_id},
        )
        logger.info(
            "sweep_upload_size_recorded",
            extra={
                "job_id": job_id,
                "sweep_id": sweep_id,
                "upload_bytes": upload_bytes,
            },
        )
        background_tasks.add_task(process_job, job_id, source_path, store, processor)
        return manifest

    @app.get("/sweeps/{job_id}", response_model=ProcessingManifest)
    async def get_sweep(job_id: str) -> ProcessingManifest:
        try:
            normalized = normalize_job_id(job_id)
        except ValueError as error:
            raise ApiError(404, "job_not_found", "Processing job not found.") from error

        manifest = store.get(normalized)
        if manifest is None:
            raise ApiError(404, "job_not_found", "Processing job not found.")
        return manifest

    @app.get("/sweeps/{job_id}/thumbnails/{frame_id}.jpg")
    async def get_thumbnail(job_id: str, frame_id: str) -> FileResponse:
        try:
            normalized = normalize_job_id(job_id)
        except ValueError as error:
            raise ApiError(
                404, "thumbnail_not_found", "Thumbnail not found."
            ) from error

        if not FRAME_ID_PATTERN.fullmatch(frame_id):
            raise ApiError(404, "thumbnail_not_found", "Thumbnail not found.")
        path = store.thumbnail_path(normalized, frame_id)
        if path is None:
            raise ApiError(404, "thumbnail_not_found", "Thumbnail not found.")
        return FileResponse(path, media_type="image/jpeg")

    return app


app = create_app()
