from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from futurium_api.embeddings import normalize_embedding_rows
from futurium_api.errors import ApiError
from futurium_api.job_store import JobStore
from futurium_api.models import (
    ProcessingManifest,
    ProcessingStatus,
    RetainedFrame,
    SearchRequest,
)
from futurium_api.search import SemanticSearch


class StaticEmbedder:
    model_id = "fake:static:v1"

    def __init__(self, text_embedding: list[float]) -> None:
        self.text_embedding = np.asarray(text_embedding, dtype=np.float32)

    def embed_images(self, _paths: list[Path]) -> np.ndarray:
        raise AssertionError("Unit search tests do not embed images")

    def embed_text(self, _text: str) -> np.ndarray:
        return self.text_embedding


def create_ready_job(store: JobStore, job_id: str, sweep_id: int) -> None:
    frames = [
        RetainedFrame(
            frame_id=f"frame_{index:06d}",
            thumbnail_url=f"/sweeps/{job_id}/thumbnails/frame_{index:06d}.jpg",
            timestamp=float(index - 1),
        )
        for index in range(1, 4)
    ]
    store.create_job(
        ProcessingManifest(
            embedding_model="fake:static:v1",
            frames=frames,
            job_id=job_id,
            retained_frame_count=len(frames),
            status=ProcessingStatus.READY,
            sweep_id=sweep_id,
        )
    )


def test_ranks_cosine_matches_and_limits_results(tmp_path: Path) -> None:
    store = JobStore(tmp_path / "jobs")
    job_id = "11111111-1111-4111-8111-111111111111"
    create_ready_job(store, job_id, 8)
    store.save_embedding_index(
        job_id,
        "fake:static:v1",
        ["frame_000001", "frame_000002", "frame_000003"],
        normalize_embedding_rows(
            np.asarray([[0.4, 0.6], [1.0, 0.0], [0.8, 0.2]], dtype=np.float32)
        ),
    )
    search = SemanticSearch(store, StaticEmbedder([1.0, 0.0]), 0.5)

    response = search.search(
        SearchRequest(query="glasses", job_ids=[job_id], result_limit=2)
    )

    assert response.confident_match is True
    assert [match.frame_id for match in response.matches] == [
        "frame_000002",
        "frame_000003",
    ]
    assert response.searched_job_count == 1
    assert response.searched_frame_count == 3


def test_ready_job_without_an_index_returns_no_confident_match(tmp_path: Path) -> None:
    store = JobStore(tmp_path / "jobs")
    job_id = "22222222-2222-4222-8222-222222222222"
    create_ready_job(store, job_id, 9)

    response = SemanticSearch(store, StaticEmbedder([1.0, 0.0]), 0.5).search(
        SearchRequest(query="keys", sweep_ids=[9])
    )

    assert response.confident_match is False
    assert response.matches == []
    assert response.unindexed_job_ids == [job_id]
    assert response.searched_frame_count == 0


def test_low_similarity_is_not_reported_as_confident(tmp_path: Path) -> None:
    store = JobStore(tmp_path / "jobs")
    job_id = "33333333-3333-4333-8333-333333333333"
    create_ready_job(store, job_id, 10)
    store.save_embedding_index(
        job_id,
        "fake:static:v1",
        ["frame_000001", "frame_000002", "frame_000003"],
        normalize_embedding_rows(
            np.asarray([[1.0, 0.0], [0.8, 0.2], [0.6, 0.4]], dtype=np.float32)
        ),
    )

    response = SemanticSearch(store, StaticEmbedder([0.0, 1.0]), 0.8).search(
        SearchRequest(query="uncertain object", job_ids=[job_id])
    )

    assert response.confident_match is False
    assert len(response.matches) == 3
    assert response.matches[0].similarity < response.confidence_threshold


def test_missing_job_is_a_structured_not_found(tmp_path: Path) -> None:
    store = JobStore(tmp_path / "jobs")
    search = SemanticSearch(store, StaticEmbedder([1.0, 0.0]), 0.5)

    with pytest.raises(ApiError) as raised:
        search.search(
            SearchRequest(
                query="mug",
                job_ids=["44444444-4444-4444-8444-444444444444"],
            )
        )

    assert raised.value.status_code == 404
    assert raised.value.code == "search_job_not_found"
