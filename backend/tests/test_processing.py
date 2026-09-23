from __future__ import annotations

from pathlib import Path

import numpy as np

from futurium_api.config import Settings
from futurium_api.processing import (
    FrameProcessor,
    difference_hash,
    hamming_distance,
    variance_of_laplacian,
)


def test_focus_and_similarity_helpers() -> None:
    sharp = np.zeros((100, 100, 3), dtype=np.uint8)
    sharp[:, 50:] = 255
    flat = np.full((100, 100, 3), 128, dtype=np.uint8)

    assert variance_of_laplacian(sharp) > 100
    assert variance_of_laplacian(flat) == 0
    assert hamming_distance(difference_hash(sharp), difference_hash(sharp)) == 0


def test_generated_video_has_expected_retention_counts(
    tmp_path: Path, generated_video: Path
) -> None:
    settings = Settings(data_dir=tmp_path / "data")
    processor = FrameProcessor(settings)
    job_dir = tmp_path / "job"
    (job_dir / "frames").mkdir(parents=True)
    (job_dir / "thumbnails").mkdir()

    duration, sampled, blurred, duplicates, frames = processor.process(
        "11111111-1111-4111-8111-111111111111", generated_video, job_dir
    )

    assert duration == 3.0
    assert sampled == 6
    assert blurred == 1
    assert duplicates == 2
    assert len(frames) == 3
    assert [frame.timestamp for frame in frames] == [0.0, 1.5, 2.5]
    assert len(list((job_dir / "frames").glob("*.jpg"))) == 3
    assert len(list((job_dir / "thumbnails").glob("*.jpg"))) == 3
    assert not (job_dir / "sampled").exists()
