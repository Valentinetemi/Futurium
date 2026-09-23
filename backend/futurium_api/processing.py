from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import cv2
import numpy as np

from .config import Settings
from .errors import ProcessingError
from .models import RetainedFrame


def variance_of_laplacian(image: np.ndarray) -> float:
    """Return focus variance; values below the configured threshold are blurry."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def difference_hash(image: np.ndarray) -> int:
    """Compute a 64-bit dHash for inexpensive consecutive-frame comparison."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, (9, 8), interpolation=cv2.INTER_AREA)
    differences = resized[:, 1:] > resized[:, :-1]
    result = 0
    for index, value in enumerate(differences.flatten()):
        if value:
            result |= 1 << index
    return result


def hamming_distance(first: int, second: int) -> int:
    return (first ^ second).bit_count()


class FrameProcessor:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def probe_duration(self, source_path: Path) -> float:
        command = [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(source_path),
        ]
        try:
            result = subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True,
                timeout=self.settings.process_timeout_seconds,
            )
            payload = json.loads(result.stdout)
            return max(0.0, float(payload["format"]["duration"]))
        except (
            FileNotFoundError,
            KeyError,
            ValueError,
            json.JSONDecodeError,
            subprocess.CalledProcessError,
            subprocess.TimeoutExpired,
        ) as error:
            raise ProcessingError(
                "video_probe_failed", "The uploaded video could not be inspected."
            ) from error

    def extract_samples(self, source_path: Path, sampled_dir: Path) -> list[Path]:
        sampled_dir.mkdir(parents=True, exist_ok=True)
        output_pattern = sampled_dir / "sample_%06d.jpg"
        command = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(source_path),
            "-vf",
            f"fps={self.settings.sample_fps}",
            "-q:v",
            "2",
            str(output_pattern),
        ]
        try:
            subprocess.run(
                command,
                check=True,
                capture_output=True,
                timeout=self.settings.process_timeout_seconds,
            )
        except FileNotFoundError as error:
            raise ProcessingError(
                "ffmpeg_unavailable", "FFmpeg is required to process this video."
            ) from error
        except subprocess.TimeoutExpired as error:
            raise ProcessingError(
                "processing_timeout", "Video processing exceeded the time limit."
            ) from error
        except subprocess.CalledProcessError as error:
            raise ProcessingError(
                "frame_extraction_failed",
                "Frames could not be extracted from the uploaded video.",
            ) from error

        samples = sorted(sampled_dir.glob("sample_*.jpg"))
        if not samples:
            raise ProcessingError(
                "no_frames_extracted", "No usable frames were found in the video."
            )
        return samples

    def create_thumbnail(self, image: np.ndarray, output_path: Path) -> None:
        height, width = image.shape[:2]
        scale = min(1.0, self.settings.thumbnail_width / max(width, 1))
        thumbnail_size = (max(1, round(width * scale)), max(1, round(height * scale)))
        thumbnail = cv2.resize(image, thumbnail_size, interpolation=cv2.INTER_AREA)
        if not cv2.imwrite(str(output_path), thumbnail, [cv2.IMWRITE_JPEG_QUALITY, 82]):
            raise ProcessingError(
                "thumbnail_failed", "A retained frame thumbnail could not be created."
            )

    def process(
        self, job_id: str, source_path: Path, job_dir: Path
    ) -> tuple[float, int, int, int, list[RetainedFrame]]:
        duration = self.probe_duration(source_path)
        sampled_dir = job_dir / "sampled"
        frames_dir = job_dir / "frames"
        thumbnails_dir = job_dir / "thumbnails"
        samples = self.extract_samples(source_path, sampled_dir)
        retained_frames: list[RetainedFrame] = []
        rejected_blur_count = 0
        rejected_duplicate_count = 0
        previous_hash: int | None = None

        try:
            for sample_index, sample_path in enumerate(samples):
                image = cv2.imread(str(sample_path), cv2.IMREAD_COLOR)
                if image is None:
                    raise ProcessingError(
                        "frame_decode_failed",
                        "An extracted frame could not be decoded.",
                    )

                if variance_of_laplacian(image) < self.settings.blur_threshold:
                    rejected_blur_count += 1
                    continue

                current_hash = difference_hash(image)
                if (
                    previous_hash is not None
                    and hamming_distance(previous_hash, current_hash)
                    <= self.settings.duplicate_hash_distance
                ):
                    rejected_duplicate_count += 1
                    continue

                frame_id = f"frame_{len(retained_frames) + 1:06d}"
                frame_path = frames_dir / f"{frame_id}.jpg"
                thumbnail_path = thumbnails_dir / f"{frame_id}.jpg"
                shutil.copyfile(sample_path, frame_path)
                self.create_thumbnail(image, thumbnail_path)
                retained_frames.append(
                    RetainedFrame(
                        frame_id=frame_id,
                        timestamp=round(sample_index / self.settings.sample_fps, 3),
                        thumbnail_url=(f"/sweeps/{job_id}/thumbnails/{frame_id}.jpg"),
                    )
                )
                previous_hash = current_hash
        finally:
            shutil.rmtree(sampled_dir, ignore_errors=True)

        return (
            round(duration, 3),
            len(samples),
            rejected_blur_count,
            rejected_duplicate_count,
            retained_frames,
        )
