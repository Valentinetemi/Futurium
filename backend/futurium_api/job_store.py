from __future__ import annotations

import os
import re
import shutil
import threading
from pathlib import Path
from uuid import UUID

from .models import ProcessingManifest

FRAME_ID_PATTERN = re.compile(r"^frame_[0-9]{6}$")


def normalize_job_id(value: str) -> str:
    return str(UUID(value))


class JobStore:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self._manifests: dict[str, ProcessingManifest] = {}
        self._lock = threading.RLock()

    def job_dir(self, job_id: str) -> Path:
        normalized = normalize_job_id(job_id)
        path = (self.root / normalized).resolve()
        if path.parent != self.root:
            raise ValueError("Invalid job identifier")
        return path

    def create_job(self, manifest: ProcessingManifest) -> Path:
        directory = self.job_dir(manifest.job_id)
        directory.mkdir(parents=False, exist_ok=False)
        (directory / "frames").mkdir()
        (directory / "thumbnails").mkdir()
        self.save(manifest)
        return directory

    def save(self, manifest: ProcessingManifest) -> None:
        directory = self.job_dir(manifest.job_id)
        directory.mkdir(parents=True, exist_ok=True)
        payload = manifest.model_dump_json(by_alias=True, indent=2)
        temporary = directory / "manifest.tmp"
        destination = directory / "manifest.json"

        with self._lock:
            temporary.write_text(payload, encoding="utf-8")
            os.replace(temporary, destination)
            self._manifests[manifest.job_id] = manifest.model_copy(deep=True)

    def get(self, job_id: str) -> ProcessingManifest | None:
        normalized = normalize_job_id(job_id)

        with self._lock:
            cached = self._manifests.get(normalized)
            if cached is not None:
                return cached.model_copy(deep=True)

            manifest_path = self.job_dir(normalized) / "manifest.json"
            if not manifest_path.is_file():
                return None

            manifest = ProcessingManifest.model_validate_json(
                manifest_path.read_text(encoding="utf-8")
            )
            self._manifests[normalized] = manifest
            return manifest.model_copy(deep=True)

    def thumbnail_path(self, job_id: str, frame_id: str) -> Path | None:
        if not FRAME_ID_PATTERN.fullmatch(frame_id):
            return None

        directory = (self.job_dir(job_id) / "thumbnails").resolve()
        path = (directory / f"{frame_id}.jpg").resolve()
        if path.parent != directory or not path.is_file():
            return None
        return path

    def list_job_ids(self) -> list[str]:
        job_ids: list[str] = []
        for entry in self.root.iterdir():
            if not entry.is_dir():
                continue
            try:
                normalized = normalize_job_id(entry.name)
            except ValueError:
                continue
            if normalized == entry.name and (entry / "manifest.json").is_file():
                job_ids.append(normalized)
        return sorted(job_ids)

    def remove_job(self, job_id: str) -> None:
        normalized = normalize_job_id(job_id)
        with self._lock:
            self._manifests.pop(normalized, None)
        shutil.rmtree(self.job_dir(normalized), ignore_errors=True)
