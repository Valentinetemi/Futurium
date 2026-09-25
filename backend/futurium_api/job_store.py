from __future__ import annotations

import os
import re
import shutil
import threading
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

import numpy as np

from .models import ProcessingManifest

FRAME_ID_PATTERN = re.compile(r"^frame_[0-9]{6}$")
EMBEDDING_INDEX_FILENAME = "embeddings.npz"


@dataclass(frozen=True, slots=True)
class FrameEmbeddingIndex:
    model_id: str
    frame_ids: tuple[str, ...]
    embeddings: np.ndarray


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

    def frame_path(self, job_id: str, frame_id: str) -> Path | None:
        if not FRAME_ID_PATTERN.fullmatch(frame_id):
            return None

        directory = (self.job_dir(job_id) / "frames").resolve()
        path = (directory / f"{frame_id}.jpg").resolve()
        if path.parent != directory or not path.is_file():
            return None
        return path

    def save_embedding_index(
        self,
        job_id: str,
        model_id: str,
        frame_ids: list[str],
        embeddings: np.ndarray,
    ) -> None:
        normalized = normalize_job_id(job_id)
        matrix = np.asarray(embeddings, dtype=np.float32)
        if not model_id or not frame_ids:
            raise ValueError("Embedding indexes require a model and at least one frame")
        if len(set(frame_ids)) != len(frame_ids) or any(
            not FRAME_ID_PATTERN.fullmatch(frame_id) for frame_id in frame_ids
        ):
            raise ValueError("Embedding index frame identifiers are invalid")
        if matrix.ndim != 2 or matrix.shape[0] != len(frame_ids):
            raise ValueError("Embedding index shape does not match its frames")
        if not np.all(np.isfinite(matrix)):
            raise ValueError("Embedding index contains non-finite values")
        if not np.allclose(np.linalg.norm(matrix, axis=1), 1.0, atol=1e-4):
            raise ValueError("Embedding index rows must be normalized")

        destination = self.job_dir(normalized) / EMBEDDING_INDEX_FILENAME
        temporary = self.job_dir(normalized) / "embeddings.tmp"
        with self._lock, temporary.open("wb") as output:
            np.savez_compressed(
                output,
                embeddings=matrix,
                frame_ids=np.asarray(frame_ids, dtype=np.str_),
                model_id=np.asarray(model_id, dtype=np.str_),
                schema_version=np.asarray(1, dtype=np.int64),
            )
            output.flush()
            os.fsync(output.fileno())
            os.replace(temporary, destination)

    def get_embedding_index(self, job_id: str) -> FrameEmbeddingIndex | None:
        path = self.job_dir(job_id) / EMBEDDING_INDEX_FILENAME
        with self._lock:
            if not path.is_file():
                return None
            with np.load(path, allow_pickle=False) as payload:
                if int(payload["schema_version"].item()) != 1:
                    raise ValueError("Unsupported embedding index version")
                model_id = str(payload["model_id"].item())
                frame_ids = tuple(str(value) for value in payload["frame_ids"].tolist())
                embeddings = np.asarray(payload["embeddings"], dtype=np.float32)

        if embeddings.ndim != 2 or embeddings.shape[0] != len(frame_ids):
            raise ValueError("Stored embedding index is invalid")
        if any(not FRAME_ID_PATTERN.fullmatch(frame_id) for frame_id in frame_ids):
            raise ValueError("Stored embedding frame identifier is invalid")
        if not np.all(np.isfinite(embeddings)):
            raise ValueError("Stored embedding index is invalid")
        return FrameEmbeddingIndex(
            model_id=model_id,
            frame_ids=frame_ids,
            embeddings=embeddings,
        )

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
