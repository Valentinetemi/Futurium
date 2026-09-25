from __future__ import annotations

import threading
from collections.abc import Sequence
from pathlib import Path
from typing import Any, Protocol

import numpy as np


class EmbeddingError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class Embedder(Protocol):
    @property
    def model_id(self) -> str: ...

    def embed_images(self, paths: Sequence[Path]) -> np.ndarray: ...

    def embed_text(self, text: str) -> np.ndarray: ...


def normalize_embedding_rows(values: np.ndarray) -> np.ndarray:
    embeddings = np.asarray(values, dtype=np.float32)
    if embeddings.ndim != 2 or embeddings.shape[1] == 0:
        raise EmbeddingError(
            "embedding_invalid", "The embedding model returned an invalid result."
        )
    if not np.all(np.isfinite(embeddings)):
        raise EmbeddingError(
            "embedding_invalid", "The embedding model returned an invalid result."
        )

    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    if np.any(norms <= 0):
        raise EmbeddingError(
            "embedding_invalid", "The embedding model returned an empty result."
        )
    return np.asarray(embeddings / norms, dtype=np.float32)


def normalize_embedding_vector(value: np.ndarray) -> np.ndarray:
    embedding = np.asarray(value, dtype=np.float32)
    if embedding.ndim == 2 and embedding.shape[0] == 1:
        embedding = embedding[0]
    if embedding.ndim != 1:
        raise EmbeddingError(
            "embedding_invalid", "The embedding model returned an invalid result."
        )
    return normalize_embedding_rows(embedding.reshape(1, -1))[0]


class OpenClipEmbedder:
    """Lazily load one OpenCLIP model and reuse it for image and text inference."""

    def __init__(
        self,
        model_name: str,
        pretrained: str,
        device: str = "auto",
    ) -> None:
        self.model_name = model_name
        self.pretrained = pretrained
        self.requested_device = device
        self._device = "cpu"
        self._model: Any | None = None
        self._preprocess: Any | None = None
        self._tokenizer: Any | None = None
        self._torch: Any | None = None
        self._load_lock = threading.Lock()
        self._inference_lock = threading.Lock()

    @property
    def model_id(self) -> str:
        return f"openclip:{self.model_name}:{self.pretrained}"

    def _load(self) -> tuple[Any, Any, Any, Any]:
        if self._model is not None:
            return self._model, self._preprocess, self._tokenizer, self._torch

        with self._load_lock:
            if self._model is not None:
                return self._model, self._preprocess, self._tokenizer, self._torch

            try:
                import open_clip
                import torch
            except ImportError as error:
                raise EmbeddingError(
                    "embedding_unavailable",
                    "OpenCLIP and PyTorch are required to prepare searchable memories.",
                ) from error

            if self.requested_device == "auto":
                if torch.backends.mps.is_available():
                    device = "mps"
                elif torch.cuda.is_available():
                    device = "cuda"
                else:
                    device = "cpu"
            else:
                device = self.requested_device

            try:
                model, _, preprocess = open_clip.create_model_and_transforms(
                    self.model_name,
                    pretrained=self.pretrained,
                    device=device,
                )
                tokenizer = open_clip.get_tokenizer(self.model_name)
                model.eval()
            except Exception as error:
                raise EmbeddingError(
                    "embedding_model_load_failed",
                    "The image search model could not be loaded.",
                ) from error

            self._device = device
            self._model = model
            self._preprocess = preprocess
            self._tokenizer = tokenizer
            self._torch = torch
            return model, preprocess, tokenizer, torch

    def embed_images(self, paths: Sequence[Path]) -> np.ndarray:
        if not paths:
            return np.empty((0, 0), dtype=np.float32)

        model, preprocess, _tokenizer, torch = self._load()
        try:
            from PIL import Image

            prepared = []
            for path in paths:
                with Image.open(path) as image:
                    prepared.append(preprocess(image.convert("RGB")))
            batch = torch.stack(prepared).to(self._device)
            with self._inference_lock, torch.inference_mode():
                features = model.encode_image(batch)
            return normalize_embedding_rows(features.float().cpu().numpy())
        except EmbeddingError:
            raise
        except Exception as error:
            raise EmbeddingError(
                "image_embedding_failed",
                "The retained room frames could not be indexed for search.",
            ) from error

    def embed_text(self, text: str) -> np.ndarray:
        model, _preprocess, tokenizer, torch = self._load()
        try:
            tokens = tokenizer([text]).to(self._device)
            with self._inference_lock, torch.inference_mode():
                features = model.encode_text(tokens)
            return normalize_embedding_vector(features.float().cpu().numpy())
        except EmbeddingError:
            raise
        except Exception as error:
            raise EmbeddingError(
                "text_embedding_failed", "The search query could not be prepared."
            ) from error
