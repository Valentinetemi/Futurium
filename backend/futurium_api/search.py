from __future__ import annotations

import numpy as np

from .embeddings import Embedder, normalize_embedding_vector
from .errors import ApiError
from .job_store import JobStore, normalize_job_id
from .models import (
    ProcessingManifest,
    ProcessingStatus,
    SearchMatch,
    SearchRequest,
    SearchResponse,
)


class SemanticSearch:
    def __init__(
        self,
        store: JobStore,
        embedder: Embedder,
        confidence_threshold: float,
    ) -> None:
        self.store = store
        self.embedder = embedder
        self.confidence_threshold = confidence_threshold

    def _requested_manifests(self, request: SearchRequest) -> list[ProcessingManifest]:
        manifests: dict[str, ProcessingManifest] = {}

        for raw_job_id in request.job_ids:
            try:
                job_id = normalize_job_id(raw_job_id)
            except ValueError as error:
                raise ApiError(
                    404,
                    "search_job_not_found",
                    "A requested processing job was not found.",
                ) from error
            manifest = self.store.get(job_id)
            if manifest is None:
                raise ApiError(
                    404,
                    "search_job_not_found",
                    "A requested processing job was not found.",
                )
            manifests[job_id] = manifest

        if request.sweep_ids:
            requested_sweep_ids = set(request.sweep_ids)
            found_sweep_ids: set[int] = set()
            for job_id in self.store.list_job_ids():
                manifest = self.store.get(job_id)
                if manifest is not None and manifest.sweep_id in requested_sweep_ids:
                    manifests[job_id] = manifest
                    found_sweep_ids.add(manifest.sweep_id)
            if found_sweep_ids != requested_sweep_ids:
                raise ApiError(
                    404,
                    "search_sweep_not_found",
                    "A requested saved memory was not found on the processing server.",
                )

        return list(manifests.values())

    def search(self, request: SearchRequest) -> SearchResponse:
        manifests = self._requested_manifests(request)
        ready_manifests = [
            manifest
            for manifest in manifests
            if manifest.status is ProcessingStatus.READY
        ]
        query_embedding = normalize_embedding_vector(
            self.embedder.embed_text(request.query)
        )
        matches: list[SearchMatch] = []
        unindexed_job_ids: list[str] = []
        searched_job_count = 0
        searched_frame_count = 0

        for manifest in ready_manifests:
            try:
                index = self.store.get_embedding_index(manifest.job_id)
            except (OSError, ValueError):
                index = None

            if index is None or index.model_id != self.embedder.model_id:
                unindexed_job_ids.append(manifest.job_id)
                continue
            if index.embeddings.shape[1] != query_embedding.shape[0]:
                unindexed_job_ids.append(manifest.job_id)
                continue

            frames_by_id = {frame.frame_id: frame for frame in manifest.frames}
            similarities = np.asarray(index.embeddings @ query_embedding)
            searched_job_count += 1
            searched_frame_count += len(index.frame_ids)

            for frame_id, similarity in zip(index.frame_ids, similarities, strict=True):
                frame = frames_by_id.get(frame_id)
                if frame is None:
                    continue
                matches.append(
                    SearchMatch(
                        frame_id=frame.frame_id,
                        job_id=manifest.job_id,
                        similarity=round(float(similarity), 6),
                        sweep_id=manifest.sweep_id,
                        thumbnail_url=frame.thumbnail_url,
                        timestamp=frame.timestamp,
                    )
                )

        ranked_matches = sorted(
            matches,
            key=lambda match: (-match.similarity, match.job_id, match.frame_id),
        )[: request.result_limit]
        confident_match = bool(
            ranked_matches and ranked_matches[0].similarity >= self.confidence_threshold
        )

        return SearchResponse(
            confidence_threshold=self.confidence_threshold,
            confident_match=confident_match,
            matches=ranked_matches,
            searched_frame_count=searched_frame_count,
            searched_job_count=searched_job_count,
            unindexed_job_ids=sorted(unindexed_job_ids),
        )
