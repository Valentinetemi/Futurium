from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class ProcessingStatus(StrEnum):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class RetainedFrame(ApiModel):
    frame_id: str
    timestamp: float = Field(ge=0)
    thumbnail_url: str


class JobError(ApiModel):
    code: str
    message: str


class ProcessingManifest(ApiModel):
    job_id: str
    sweep_id: int = Field(gt=0)
    status: ProcessingStatus
    duration: float = Field(default=0, ge=0)
    total_frames_sampled: int = Field(default=0, ge=0)
    retained_frame_count: int = Field(default=0, ge=0)
    rejected_blur_count: int = Field(default=0, ge=0)
    rejected_duplicate_count: int = Field(default=0, ge=0)
    frames: list[RetainedFrame] = Field(default_factory=list)
    embedding_model: str | None = None
    error: JobError | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class HealthResponse(ApiModel):
    status: str
    ffmpeg_available: bool
    ffprobe_available: bool


class ErrorDetail(ApiModel):
    code: str
    message: str


class ErrorResponse(ApiModel):
    error: ErrorDetail


class SearchRequest(ApiModel):
    query: str = Field(min_length=1, max_length=200)
    job_ids: list[str] = Field(default_factory=list, max_length=50)
    sweep_ids: list[int] = Field(default_factory=list, max_length=50)
    result_limit: int = Field(default=3, ge=1, le=3)

    @field_validator("query")
    @classmethod
    def normalize_query(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("query must contain visible characters")
        return normalized

    @field_validator("sweep_ids")
    @classmethod
    def validate_sweep_ids(cls, values: list[int]) -> list[int]:
        if any(value <= 0 for value in values):
            raise ValueError("sweep IDs must be positive")
        return list(dict.fromkeys(values))

    @field_validator("job_ids")
    @classmethod
    def deduplicate_job_ids(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(values))

    @model_validator(mode="after")
    def require_search_scope(self) -> Self:
        if not self.job_ids and not self.sweep_ids:
            raise ValueError("at least one job ID or sweep ID is required")
        return self


class SearchMatch(ApiModel):
    job_id: str
    sweep_id: int = Field(gt=0)
    frame_id: str
    timestamp: float = Field(ge=0)
    thumbnail_url: str
    similarity: float = Field(ge=-1, le=1)


class SearchResponse(ApiModel):
    confident_match: bool
    confidence_threshold: float = Field(ge=-1, le=1)
    matches: list[SearchMatch]
    searched_job_count: int = Field(ge=0)
    searched_frame_count: int = Field(ge=0)
    unindexed_job_ids: list[str]
