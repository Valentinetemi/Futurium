from __future__ import annotations

import asyncio
import logging
import shutil
import threading
import time
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHttpException

from .config import Settings
from .embeddings import Embedder, EmbeddingError, OpenClipEmbedder
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
    SearchRequest,
    SearchResponse,
    TranscriptionResponse,
)
from .processing import FrameProcessor
from .search import SemanticSearch
from .transcription import GeminiTranscriber, Transcriber, TranscriptionError

ALLOWED_MEDIA_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-m4v",
}
AUDIO_MEDIA_TYPES = {
    "audio/aac": "audio/aac",
    "audio/m4a": "audio/m4a",
    "audio/mp3": "audio/mp3",
    "audio/mp4": "audio/m4a",
    "audio/mpeg": "audio/mpeg",
    "audio/ogg": "audio/ogg",
    "audio/wav": "audio/wav",
    "audio/webm": "audio/webm",
    "audio/x-m4a": "audio/m4a",
}
UPLOAD_CHUNK_BYTES = 1024 * 1024

logger = logging.getLogger("futurium_api")


def elapsed_milliseconds(started_at: float) -> float:
    return round((time.perf_counter() - started_at) * 1000, 2)


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    payload = ErrorResponse(error=ErrorDetail(code=code, message=message))
    return JSONResponse(
        status_code=status_code, content=payload.model_dump(by_alias=True)
    )


async def save_bounded_upload(
    upload: UploadFile, destination: Path, max_bytes: int, media_label: str = "Video"
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
                        (
                            f"{media_label} exceeds the "
                            f"{max_bytes // (1024 * 1024)} MiB limit."
                        ),
                    )
                output.write(chunk)
    finally:
        await upload.close()

    if total_bytes == 0:
        raise ApiError(
            400,
            "empty_upload",
            f"The uploaded {media_label.lower()} is empty.",
        )
    return total_bytes


def clear_processed_images(job_dir: Path) -> None:
    (job_dir / "embeddings.npz").unlink(missing_ok=True)
    for directory_name in ("frames", "thumbnails", "sampled"):
        directory = job_dir / directory_name
        if directory.is_dir():
            shutil.rmtree(directory, ignore_errors=True)
            if directory_name != "sampled":
                directory.mkdir(exist_ok=True)


def recover_interrupted_jobs(store: JobStore) -> None:
    for job_id in store.list_job_ids():
        job_dir = store.job_dir(job_id)
        (job_dir / "source.upload").unlink(missing_ok=True)

        try:
            manifest = store.get(job_id)
        except Exception:
            logger.warning(
                "sweep_recovery_manifest_unreadable", extra={"job_id": job_id}
            )
            continue

        if manifest is None or manifest.status is not ProcessingStatus.PROCESSING:
            continue

        clear_processed_images(job_dir)
        manifest.status = ProcessingStatus.FAILED
        manifest.error = JobError(
            code="processing_interrupted",
            message=(
                "Processing was interrupted. The saved memory can be uploaded again."
            ),
        )
        store.save(manifest)
        logger.warning(
            "sweep_processing_recovered_as_failed",
            extra={
                "job_id": job_id,
                "sweep_id": manifest.sweep_id,
                "status": manifest.status.value,
            },
        )


def process_job(
    job_id: str,
    source_path: Path,
    store: JobStore,
    processor: FrameProcessor,
    embedder: Embedder,
    queued_at: float,
) -> None:
    processing_started_at = time.perf_counter()
    manifest: ProcessingManifest | None = None
    try:
        manifest = store.get(job_id)
        if manifest is None:
            return

        logger.info(
            "sweep_processing_started",
            extra={
                "job_id": job_id,
                "sweep_id": manifest.sweep_id,
                "queue_delay_ms": elapsed_milliseconds(queued_at),
                "worker_thread": threading.current_thread().name,
            },
        )
        try:
            duration, sampled, blur_count, duplicate_count, frames = processor.process(
                job_id, source_path, store.job_dir(job_id)
            )
            if frames:
                frame_paths: list[Path] = []
                for frame in frames:
                    frame_path = store.frame_path(job_id, frame.frame_id)
                    if frame_path is None:
                        raise ProcessingError(
                            "retained_frame_missing",
                            "A retained room frame could not be indexed.",
                        )
                    frame_paths.append(frame_path)
                embeddings = embedder.embed_images(frame_paths)
                if embeddings.shape[0] != len(frames):
                    raise EmbeddingError(
                        "embedding_invalid",
                        "The image search model returned an invalid frame index.",
                    )
                store.save_embedding_index(
                    job_id,
                    embedder.model_id,
                    [frame.frame_id for frame in frames],
                    embeddings,
                )
                manifest.embedding_model = embedder.model_id
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
        except (EmbeddingError, ProcessingError) as error:
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
        logger.info(
            "sweep_processing_finished",
            extra={
                "job_id": job_id,
                "sweep_id": manifest.sweep_id if manifest is not None else None,
                "status": manifest.status.value if manifest is not None else "unknown",
                "elapsed_ms": elapsed_milliseconds(processing_started_at),
                "worker_thread": threading.current_thread().name,
            },
        )


def create_app(
    settings: Settings | None = None,
    embedder: Embedder | None = None,
    transcriber: Transcriber | None = None,
) -> FastAPI:
    configure_logging()
    active_settings = settings or Settings.from_environment()
    store = JobStore(active_settings.data_dir)
    recover_interrupted_jobs(store)
    processor = FrameProcessor(active_settings)
    active_embedder = embedder or OpenClipEmbedder(
        active_settings.embedding_model,
        active_settings.embedding_pretrained,
        active_settings.embedding_device,
    )
    semantic_search = SemanticSearch(
        store,
        active_embedder,
        active_settings.search_confidence_threshold,
    )
    active_transcriber = transcriber or GeminiTranscriber(
        active_settings.gemini_api_key,
        active_settings.gemini_transcription_model,
    )
    processing_tasks: set[asyncio.Task[None]] = set()
    app = FastAPI(
        title="Futurium Processing API",
        version="0.1.0",
        description="Extracts useful frames from saved room sweeps.",
    )

    def processing_task_finished(task: asyncio.Task[None]) -> None:
        processing_tasks.discard(task)
        if task.cancelled():
            logger.warning("sweep_processing_task_cancelled")
            return
        error = task.exception()
        if error is not None:
            logger.error(
                "sweep_processing_task_failed",
                extra={"error_type": type(error).__name__},
            )

    def start_processing_task(job_id: str, source_path: Path, queued_at: float) -> None:
        task = asyncio.create_task(
            asyncio.to_thread(
                process_job,
                job_id,
                source_path,
                store,
                processor,
                active_embedder,
                queued_at,
            ),
            name=f"process-sweep-{job_id}",
        )
        processing_tasks.add(task)
        task.add_done_callback(processing_task_finished)

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

    @app.exception_handler(StarletteHttpException)
    async def handle_http_error(
        _request: Request, error: StarletteHttpException
    ) -> JSONResponse:
        if error.status_code == 404:
            return error_response(
                404, "not_found", "The requested resource was not found."
            )
        if error.status_code == 405:
            return error_response(
                405, "method_not_allowed", "This method is not allowed."
            )
        return error_response(
            error.status_code, "http_error", "The request could not be completed."
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
        responses={
            400: {"model": ErrorResponse},
            413: {"model": ErrorResponse},
            415: {"model": ErrorResponse},
            422: {"model": ErrorResponse},
            503: {"model": ErrorResponse},
        },
    )
    async def upload_sweep(
        sweep_id: Annotated[int, Form(gt=0)],
        video: Annotated[UploadFile, File()],
    ) -> ProcessingManifest:
        request_started_at = time.perf_counter()
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

        upload_started_at = time.perf_counter()
        try:
            upload_bytes = await save_bounded_upload(
                video, source_path, active_settings.max_upload_bytes
            )
        except Exception:
            store.remove_job(job_id)
            raise

        logger.info(
            "sweep_upload_completed",
            extra={
                "job_id": job_id,
                "sweep_id": sweep_id,
                "upload_bytes": upload_bytes,
                "elapsed_ms": elapsed_milliseconds(upload_started_at),
            },
        )
        queued_at = time.perf_counter()
        start_processing_task(job_id, source_path, queued_at)
        logger.info(
            "sweep_202_response_ready",
            extra={
                "job_id": job_id,
                "sweep_id": sweep_id,
                "status": manifest.status.value,
                "status_code": 202,
                "elapsed_ms": elapsed_milliseconds(request_started_at),
            },
        )
        return manifest

    @app.get("/sweeps/{job_id}", response_model=ProcessingManifest)
    async def get_sweep(job_id: str) -> ProcessingManifest:
        poll_started_at = time.perf_counter()
        normalized: str | None = None
        manifest: ProcessingManifest | None = None
        status_code = 500
        try:
            try:
                normalized = normalize_job_id(job_id)
            except ValueError as error:
                status_code = 404
                raise ApiError(
                    404, "job_not_found", "Processing job not found."
                ) from error

            manifest = store.get(normalized)
            if manifest is None:
                status_code = 404
                raise ApiError(404, "job_not_found", "Processing job not found.")
            status_code = 200
            return manifest
        finally:
            logger.info(
                "sweep_poll_completed",
                extra={
                    "job_id": normalized,
                    "sweep_id": manifest.sweep_id if manifest is not None else None,
                    "status": (manifest.status.value if manifest is not None else None),
                    "status_code": status_code,
                    "elapsed_ms": elapsed_milliseconds(poll_started_at),
                },
            )

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

    @app.post(
        "/search",
        response_model=SearchResponse,
        responses={
            404: {"model": ErrorResponse},
            422: {"model": ErrorResponse},
            503: {"model": ErrorResponse},
        },
    )
    async def search_memories(request: SearchRequest) -> SearchResponse:
        started_at = time.perf_counter()
        try:
            response = await asyncio.to_thread(semantic_search.search, request)
        except EmbeddingError as error:
            raise ApiError(503, error.code, error.message) from error
        logger.info(
            "semantic_search_completed",
            extra={
                "confident_match": response.confident_match,
                "elapsed_ms": elapsed_milliseconds(started_at),
                "result_count": len(response.matches),
                "searched_frame_count": response.searched_frame_count,
                "searched_job_count": response.searched_job_count,
            },
        )
        return response

    @app.post(
        "/transcriptions",
        response_model=TranscriptionResponse,
        responses={
            400: {"model": ErrorResponse},
            413: {"model": ErrorResponse},
            415: {"model": ErrorResponse},
            422: {"model": ErrorResponse},
            503: {"model": ErrorResponse},
        },
    )
    async def transcribe_voice_query(
        audio: Annotated[UploadFile, File()],
    ) -> TranscriptionResponse:
        started_at = time.perf_counter()
        media_type = (audio.content_type or "").lower()
        provider_media_type = AUDIO_MEDIA_TYPES.get(media_type)
        if provider_media_type is None:
            await audio.close()
            raise ApiError(
                415,
                "unsupported_audio_type",
                "Upload an M4A, MP3, AAC, WAV, OGG, or WebM audio recording.",
            )

        temporary_path = active_settings.data_dir / f"voice-query-{uuid4()}.upload"
        upload_bytes = 0
        try:
            upload_bytes = await save_bounded_upload(
                audio,
                temporary_path,
                active_settings.max_audio_upload_bytes,
                "Audio",
            )
            try:
                transcription = await asyncio.to_thread(
                    active_transcriber.transcribe,
                    temporary_path,
                    provider_media_type,
                )
            except TranscriptionError as error:
                raise ApiError(503, error.code, error.message) from error
        finally:
            temporary_path.unlink(missing_ok=True)

        logger.info(
            "voice_transcription_completed",
            extra={
                "elapsed_ms": elapsed_milliseconds(started_at),
                "model": active_transcriber.model_id,
                "upload_bytes": upload_bytes,
            },
        )
        return TranscriptionResponse(transcription=transcription)

    return app


app = create_app()
