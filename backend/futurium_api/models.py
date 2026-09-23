from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


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
