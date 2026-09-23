from __future__ import annotations

from pathlib import Path
from uuid import UUID

from fastapi.testclient import TestClient

from futurium_api.config import Settings
from futurium_api.main import create_app


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

    manifest_response = client.get(f"/sweeps/{job_id}")
    assert manifest_response.status_code == 200
    manifest = manifest_response.json()
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
    manifest = client.get(f"/sweeps/{job_id}").json()
    assert manifest["status"] == "failed"
    assert manifest["error"]["code"] == "video_probe_failed"
    assert not (data_dir / job_id / "source.upload").exists()


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
