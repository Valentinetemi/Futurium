from __future__ import annotations

import threading
import time
from pathlib import Path
from uuid import UUID

from fastapi.testclient import TestClient

from futurium_api.config import Settings
from futurium_api.job_store import JobStore
from futurium_api.main import create_app
from futurium_api.models import ProcessingManifest, ProcessingStatus
from futurium_api.processing import FrameProcessor


def wait_for_terminal_manifest(
    client: TestClient, job_id: str, timeout_seconds: float = 10
) -> dict[str, object]:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        response = client.get(f"/sweeps/{job_id}")
        assert response.status_code == 200
        manifest = response.json()
        if manifest["status"] in {"ready", "failed"}:
            return manifest
        time.sleep(0.02)
    raise AssertionError("Processing did not reach a terminal state in time")


def test_health_reports_processing_dependencies(tmp_path: Path) -> None:
    client = TestClient(create_app(Settings(data_dir=tmp_path / "jobs")))

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "ffmpegAvailable": True,
        "ffprobeAvailable": True,
    }


def test_upload_processes_video_and_serves_manifest_and_thumbnail(
    tmp_path: Path, generated_video: Path
) -> None:
    data_dir = tmp_path / "jobs"
    client = TestClient(create_app(Settings(data_dir=data_dir)))

    with generated_video.open("rb") as video:
        response = client.post(
            "/sweeps",
            data={"sweep_id": "42"},
            files={"video": ("../../ignored-client-name.mp4", video, "video/mp4")},
        )

    assert response.status_code == 202
    job_id = response.json()["jobId"]
    UUID(job_id)

    manifest = wait_for_terminal_manifest(client, job_id)
    assert manifest["sweepId"] == 42
    assert manifest["status"] == "ready"
    assert manifest["duration"] == 3.0
    assert manifest["totalFramesSampled"] == 6
    assert manifest["retainedFrameCount"] == 3
    assert manifest["rejectedBlurCount"] == 1
    assert manifest["rejectedDuplicateCount"] == 2
    assert len(manifest["frames"]) == 3
    assert not (data_dir / job_id / "source.upload").exists()

    thumbnail_response = client.get(manifest["frames"][0]["thumbnailUrl"])
    assert thumbnail_response.status_code == 200
    assert thumbnail_response.headers["content-type"] == "image/jpeg"


def test_failed_processing_deletes_uploaded_source(tmp_path: Path) -> None:
    data_dir = tmp_path / "jobs"
    client = TestClient(create_app(Settings(data_dir=data_dir)))

    response = client.post(
        "/sweeps",
        data={"sweep_id": "7"},
        files={"video": ("not-video.mp4", b"not a video", "video/mp4")},
    )

    assert response.status_code == 202
    job_id = response.json()["jobId"]
    manifest = wait_for_terminal_manifest(client, job_id)
    assert manifest["status"] == "failed"
    assert manifest["error"]["code"] == "video_probe_failed"
    assert not (data_dir / job_id / "source.upload").exists()


def test_upload_returns_immediately_and_polling_works_during_processing(
    tmp_path: Path, monkeypatch
) -> None:
    processing_started = threading.Event()
    release_processing = threading.Event()

    def slow_process(
        _processor: FrameProcessor,
        _job_id: str,
        _source_path: Path,
        _job_dir: Path,
    ) -> tuple[float, int, int, int, list[object]]:
        processing_started.set()
        if not release_processing.wait(timeout=3):
            raise AssertionError("Test processor was not released")
        return 1.0, 0, 0, 0, []

    monkeypatch.setattr(FrameProcessor, "process", slow_process)
    release_fallback = threading.Timer(2, release_processing.set)
    release_fallback.start()

    try:
        with TestClient(create_app(Settings(data_dir=tmp_path / "jobs"))) as client:
            request_started = time.monotonic()
            response = client.post(
                "/sweeps",
                data={"sweep_id": "99"},
                files={"video": ("sweep.mp4", b"test video", "video/mp4")},
            )
            request_elapsed = time.monotonic() - request_started

            assert response.status_code == 202
            assert request_elapsed < 1
            assert response.json()["status"] == "processing"
            assert processing_started.wait(timeout=1)

            poll_started = time.monotonic()
            poll_response = client.get(f"/sweeps/{response.json()['jobId']}")
            poll_elapsed = time.monotonic() - poll_started

            assert poll_response.status_code == 200
            assert poll_response.json()["status"] == "processing"
            assert poll_elapsed < 1

            release_processing.set()
            terminal = wait_for_terminal_manifest(client, response.json()["jobId"])
            assert terminal["status"] == "ready"
    finally:
        release_processing.set()
        release_fallback.cancel()


def test_rejects_unsupported_media_before_creating_job(tmp_path: Path) -> None:
    data_dir = tmp_path / "jobs"
    client = TestClient(create_app(Settings(data_dir=data_dir)))

    response = client.post(
        "/sweeps",
        data={"sweep_id": "1"},
        files={"video": ("notes.txt", b"private", "text/plain")},
    )

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "unsupported_media_type"
    assert list(data_dir.iterdir()) == []


def test_enforces_upload_size_limit_and_cleans_partial_job(tmp_path: Path) -> None:
    data_dir = tmp_path / "jobs"
    client = TestClient(create_app(Settings(data_dir=data_dir, max_upload_bytes=16)))

    response = client.post(
        "/sweeps",
        data={"sweep_id": "1"},
        files={"video": ("sweep.mp4", b"x" * 17, "video/mp4")},
    )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "upload_too_large"
    assert list(data_dir.iterdir()) == []


def test_invalid_identifiers_return_structured_not_found(tmp_path: Path) -> None:
    client = TestClient(create_app(Settings(data_dir=tmp_path / "jobs")))

    response = client.get("/sweeps/not-a-job-id")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "job_not_found",
            "message": "Processing job not found.",
        }
    }

    missing_route = client.get("/sweeps/not-a-job-id/unknown")
    assert missing_route.status_code == 404
    assert missing_route.json()["error"]["code"] == "not_found"


def test_startup_recovers_interrupted_job_and_deletes_source(tmp_path: Path) -> None:
    data_dir = tmp_path / "jobs"
    store = JobStore(data_dir)
    manifest = ProcessingManifest(
        job_id="11111111-1111-4111-8111-111111111111",
        sweep_id=18,
        status=ProcessingStatus.PROCESSING,
    )
    job_dir = store.create_job(manifest)
    source_path = job_dir / "source.upload"
    source_path.write_bytes(b"private room video")
    (job_dir / "frames" / "partial.jpg").write_bytes(b"partial")

    client = TestClient(create_app(Settings(data_dir=data_dir)))
    response = client.get(f"/sweeps/{manifest.job_id}")

    assert response.status_code == 200
    recovered = response.json()
    assert recovered["status"] == "failed"
    assert recovered["error"]["code"] == "processing_interrupted"
    assert not source_path.exists()
    assert list((job_dir / "frames").iterdir()) == []
