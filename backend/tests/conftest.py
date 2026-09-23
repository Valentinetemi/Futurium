from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import cv2
import numpy as np
import pytest


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
    frames_dir = tmp_path / "source-frames"
    frames_dir.mkdir()
    for index, frame in enumerate(frames, start=1):
        assert cv2.imwrite(str(frames_dir / f"frame_{index:03d}.png"), frame)

    video_path = tmp_path / "generated-sweep.mp4"
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
            str(video_path),
        ],
        check=True,
        capture_output=True,
    )
    return video_path
