from __future__ import annotations

import json
import logging
from datetime import UTC, datetime


class JsonFormatter(logging.Formatter):
    _context_fields = (
        "job_id",
        "sweep_id",
        "upload_bytes",
        "status",
        "total_frames_sampled",
        "retained_frame_count",
        "rejected_blur_count",
        "rejected_duplicate_count",
        "elapsed_ms",
        "queue_delay_ms",
        "status_code",
        "worker_thread",
        "error_type",
        "confident_match",
        "result_count",
        "searched_frame_count",
        "searched_job_count",
    )

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname.lower(),
            "event": record.getMessage(),
        }
        for field in self._context_fields:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        return json.dumps(payload, separators=(",", ":"))


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(logging.INFO)
