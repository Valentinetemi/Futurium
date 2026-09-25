from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Protocol

logger = logging.getLogger("futurium_api")


class TranscriptionError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class Transcriber(Protocol):
    @property
    def model_id(self) -> str: ...

    def transcribe(self, audio_path: Path, media_type: str) -> str: ...


class GeminiTranscriber:
    """Transcribe short audio with Gemini and remove its remote file afterward."""

    def __init__(self, api_key: str | None, model: str) -> None:
        self._api_key = api_key
        self._model = model
        self._client: object | None = None
        self._client_lock = threading.Lock()

    @property
    def model_id(self) -> str:
        return self._model

    def _get_client(self) -> object:
        if not self._api_key:
            raise TranscriptionError(
                "transcription_unavailable",
                "Voice transcription is not configured on the server.",
            )

        with self._client_lock:
            if self._client is not None:
                return self._client
            try:
                from google import genai
            except ImportError as error:
                raise TranscriptionError(
                    "transcription_unavailable",
                    "Voice transcription is not installed on the server.",
                ) from error
            self._client = genai.Client(api_key=self._api_key)
            return self._client

    def transcribe(self, audio_path: Path, media_type: str) -> str:
        client = self._get_client()
        uploaded_file: object | None = None
        remote_name: str | None = None
        primary_error: Exception | None = None

        try:
            from google.genai import types

            uploaded_file = client.files.upload(  # type: ignore[union-attr]
                file=audio_path,
                config=types.UploadFileConfig(
                    display_name="Futurium voice query",
                    mime_type=media_type,
                ),
            )
            remote_name = getattr(uploaded_file, "name", None)
            response = client.models.generate_content(  # type: ignore[union-attr]
                model=self._model,
                contents=[uploaded_file],
                config=types.GenerateContentConfig(
                    audio_transcription_config=types.AudioTranscriptionConfig(
                        mode="SMART"
                    )
                ),
            )
            transcription = " ".join((response.text or "").split())
            if not transcription:
                raise TranscriptionError(
                    "transcription_empty",
                    "No speech could be transcribed from that recording.",
                )
            return transcription[:200]
        except TranscriptionError as error:
            primary_error = error
            raise
        except Exception as error:
            primary_error = error
            raise TranscriptionError(
                "transcription_failed",
                "The voice query could not be transcribed. Please try again.",
            ) from error
        finally:
            if remote_name:
                try:
                    client.files.delete(name=remote_name)  # type: ignore[union-attr]
                except Exception as cleanup_error:
                    logger.warning(
                        "voice_transcription_remote_cleanup_failed",
                        extra={
                            "error_type": type(cleanup_error).__name__,
                            "had_transcription_error": primary_error is not None,
                        },
                    )
