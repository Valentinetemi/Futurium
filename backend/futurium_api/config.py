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


def _similarity_threshold(name: str, default: float) -> float:
    value = float(os.getenv(name, str(default)))
    if value < -1 or value > 1:
        raise ValueError(f"{name} must be between -1 and 1")
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
    embedding_model: str = "ViT-B-32"
    embedding_pretrained: str = "laion2b_s34b_b79k"
    embedding_device: str = "auto"
    search_confidence_threshold: float = 0.23
    max_audio_upload_bytes: int = 5 * 1024 * 1024
    gemini_api_key: str | None = None
    gemini_transcription_model: str = "gemini-3.5-transcribe"

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
            embedding_model=os.getenv("FUTURIUM_EMBEDDING_MODEL", "ViT-B-32"),
            embedding_pretrained=os.getenv(
                "FUTURIUM_EMBEDDING_PRETRAINED", "laion2b_s34b_b79k"
            ),
            embedding_device=os.getenv("FUTURIUM_EMBEDDING_DEVICE", "auto"),
            search_confidence_threshold=_similarity_threshold(
                "FUTURIUM_SEARCH_CONFIDENCE_THRESHOLD", 0.23
            ),
            max_audio_upload_bytes=_positive_int(
                "FUTURIUM_MAX_AUDIO_UPLOAD_BYTES", 5 * 1024 * 1024
            ),
            gemini_api_key=os.getenv("GEMINI_API_KEY") or None,
            gemini_transcription_model=os.getenv(
                "FUTURIUM_GEMINI_TRANSCRIPTION_MODEL", "gemini-3.5-transcribe"
            ),
        )
