from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _positive_int(name: str, default: int) -> int:
    value = int(os.getenv(name, str(default)))
    if value <= 0:
        raise ValueError(f"{name} must be greater than zero")
    return value


def _positive_float(name: str, default: float) -> float:
    value = float(os.getenv(name, str(default)))
    if value <= 0:
        raise ValueError(f"{name} must be greater than zero")
    return value


@dataclass(frozen=True, slots=True)
class Settings:
    data_dir: Path
    max_upload_bytes: int = 100 * 1024 * 1024
    sample_fps: float = 2.0
    blur_threshold: float = 100.0
    duplicate_hash_distance: int = 5
    thumbnail_width: int = 320
    process_timeout_seconds: int = 180

    @classmethod
    def from_environment(cls) -> Settings:
        duplicate_distance = int(os.getenv("FUTURIUM_DUPLICATE_HASH_DISTANCE", "5"))
        if duplicate_distance < 0 or duplicate_distance > 64:
            raise ValueError(
                "FUTURIUM_DUPLICATE_HASH_DISTANCE must be between 0 and 64"
            )

        return cls(
            data_dir=Path(os.getenv("FUTURIUM_DATA_DIR", "./data")).expanduser(),
            max_upload_bytes=_positive_int(
                "FUTURIUM_MAX_UPLOAD_BYTES", 100 * 1024 * 1024
            ),
            sample_fps=_positive_float("FUTURIUM_SAMPLE_FPS", 2.0),
            blur_threshold=_positive_float("FUTURIUM_BLUR_THRESHOLD", 100.0),
            duplicate_hash_distance=duplicate_distance,
            thumbnail_width=_positive_int("FUTURIUM_THUMBNAIL_WIDTH", 320),
            process_timeout_seconds=_positive_int(
                "FUTURIUM_PROCESS_TIMEOUT_SECONDS", 180
            ),
        )
