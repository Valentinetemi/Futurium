from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import cv2
import numpy as np
import pytest

from futurium_api.embeddings import normalize_embedding_rows
from futurium_api.transcription import TranscriptionError


class FakeEmbedder:
    model_id = "fake:object-colors:v1"

    def embed_images(self, paths: list[Path]) -> np.ndarray:
        rows: list[list[float]] = []
        for path in paths:
            image = cv2.imread(str(path), cv2.IMREAD_COLOR)
            assert image is not None
            blue, green, red = image.mean(axis=(0, 1))
            strongest = int(np.argmax([red, blue, green]))
            row = [0.0, 0.0, 0.0]
            row[strongest] = 1.0
            rows.append(row)
        return normalize_embedding_rows(np.asarray(rows, dtype=np.float32))

    def embed_text(self, text: str) -> np.ndarray:
        normalized = text.lower()
        if "glass" in normalized:
            return np.asarray([1.0, 0.0, 0.0], dtype=np.float32)
        if "mug" in normalized or "cup" in normalized:
            return np.asarray([0.0, 1.0, 0.0], dtype=np.float32)
        if "key" in normalized:
            return np.asarray([0.0, 0.0, 1.0], dtype=np.float32)
        return normalize_embedding_rows(
            np.asarray([[1.0, 1.0, 1.0]], dtype=np.float32)
        )[0]


@pytest.fixture
def fake_embedder() -> FakeEmbedder:
    return FakeEmbedder()


class FakeTranscriber:
    model_id = "fake:voice-transcriber:v1"

    def __init__(self) -> None:
        self.calls: list[tuple[bytes, str]] = []
        self.error: TranscriptionError | None = None

    def transcribe(self, audio_path: Path, media_type: str) -> str:
        self.calls.append((audio_path.read_bytes(), media_type))
        if self.error is not None:
            raise self.error
        return "Where are my glasses?"


@pytest.fixture
def fake_transcriber() -> FakeTranscriber:
    return FakeTranscriber()


def _sharp_frame(kind: str) -> np.ndarray:
    height, width = 240, 320
    image = np.full((height, width, 3), 245, dtype=np.uint8)

    if kind == "a":
        image[:, : width // 2] = 15
        for x in range(12, width // 2, 24):
            cv2.line(image, (x, 0), (x, height), (255, 255, 255), 2)
    elif kind == "b":
        image[:, width // 2 :] = 15
        for y in range(12, height, 24):
            cv2.line(image, (0, y), (width, y), (20, 20, 20), 2)
    else:
        tile = 24
        for y in range(0, height, tile):
            for x in range(0, width, tile):
                if (x // tile + y // tile) % 2 == 0:
                    image[y : y + tile, x : x + tile] = 20

    cv2.putText(
        image,
        kind.upper(),
        (120, 150),
        cv2.FONT_HERSHEY_SIMPLEX,
        2.5,
        (80, 170, 230),
        6,
        cv2.LINE_AA,
    )
    return image


def _object_frame(kind: str) -> np.ndarray:
    image = np.full((240, 320, 3), 35, dtype=np.uint8)
    if kind == "glasses":
        color = (30, 30, 235)
        cv2.circle(image, (105, 105), 45, color, 18)
        cv2.circle(image, (215, 105), 45, color, 18)
        cv2.line(image, (150, 105), (170, 105), color, 14)
    elif kind == "mug":
        color = (235, 45, 30)
        cv2.rectangle(image, (90, 55), (220, 190), color, -1)
        cv2.circle(image, (235, 115), 48, color, 18)
    else:
        color = (35, 225, 45)
        cv2.circle(image, (105, 100), 38, color, 16)
        cv2.line(image, (135, 125), (235, 195), color, 18)
        cv2.line(image, (205, 175), (230, 145), color, 14)
    cv2.putText(
        image,
        kind.upper(),
        (35, 225),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.85,
        color,
        3,
        cv2.LINE_AA,
    )
    return image


def _write_video(frames: list[np.ndarray], output_path: Path) -> Path:
    frames_dir = output_path.parent / f"{output_path.stem}-frames"
    frames_dir.mkdir()
    for index, frame in enumerate(frames, start=1):
        assert cv2.imwrite(str(frames_dir / f"frame_{index:03d}.png"), frame)

    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-framerate",
            "2",
            "-i",
            str(frames_dir / "frame_%03d.png"),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(output_path),
        ],
        check=True,
        capture_output=True,
    )
    return output_path


@pytest.fixture
def generated_video(tmp_path: Path) -> Path:
    """Generate six deterministic frames; no binary fixture is stored in Git."""
    if shutil.which("ffmpeg") is None:
        pytest.skip("FFmpeg is required for processing tests")

    frames = [
        _sharp_frame("a"),
        _sharp_frame("a"),
        np.full((240, 320, 3), 128, dtype=np.uint8),
        _sharp_frame("b"),
        _sharp_frame("b"),
        _sharp_frame("c"),
    ]
    return _write_video(frames, tmp_path / "generated-sweep.mp4")


@pytest.fixture
def generated_object_video(tmp_path: Path) -> Path:
    """Generate a sweep containing glasses, a mug, and keys without a fixture."""
    if shutil.which("ffmpeg") is None:
        pytest.skip("FFmpeg is required for processing tests")
    frames = [
        _object_frame("glasses"),
        _object_frame("glasses"),
        _object_frame("mug"),
        _object_frame("mug"),
        _object_frame("keys"),
        _object_frame("keys"),
    ]
    return _write_video(frames, tmp_path / "object-sweep.mp4")
