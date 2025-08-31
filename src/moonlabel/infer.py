from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Tuple

import moondream as md
from PIL import Image

"""Inference utilities for MoonLabel.

This module encapsulates the logic to run object detection via the
Moondream vision-language model, supporting three sources:

- "cloud": uses an API key and Moondream's hosted endpoint.
- "station": uses a user-provided local Station endpoint.
- "local": lazy-loads a Hugging Face model for on-device inference.

The class exposes a minimal `detect` API returning a PIL image and a
list of detection dictionaries produced by the underlying model.
"""



_HF_MODEL = None


class MoonDreamInference:
    """Unified inference interface for Moondream detection.

    Parameters:
    - api_key: API key for the hosted (cloud) Moondream service.
    - station_endpoint: URL for a local Station endpoint.

    If neither is provided, a local Hugging Face model is loaded lazily
    (once per process) for on-device inference.
    """

    # In practice this can be a cloud client, a Station client, or an HF model
    model: Any
    source: Literal["cloud", "station", "local"]

    def __init__(self, api_key: Optional[str] = None, station_endpoint: Optional[str] = None):
        if api_key and api_key.strip():
            self.model = md.vl(api_key=api_key)
            self.source = "cloud"
        elif station_endpoint and station_endpoint.strip():
            self.model = md.vl(endpoint=station_endpoint)
            self.source = "station"
        else:
            global _HF_MODEL
            if _HF_MODEL is None:
                try:
                    from transformers import AutoModelForCausalLM  # type: ignore
                    import torch  # type: ignore
                    import os
                except Exception as exc:  # ImportError or others
                    raise RuntimeError(
                        "Local inference requires optional dependencies. Install with 'pip install \"moonlabel[local]\"' or provide api_key/station_endpoint."
                    ) from exc

                env_device = os.getenv("MOONDREAM_DEVICE", "").lower()
                if env_device:
                    device_target = env_device
                else:
                    if torch.cuda.is_available():
                        device_target = "cuda"
                    elif torch.backends.mps.is_available():
                        device_target = "mps"
                    else:
                        device_target = "cpu"

                device_map_arg = {"": device_target} if device_target != "cpu" else None

                _HF_MODEL = AutoModelForCausalLM.from_pretrained(
                    "vikhyatk/moondream2",
                    revision="2025-06-21",
                    trust_remote_code=True,
                    device_map=device_map_arg,
                )
            self.model = _HF_MODEL
            self.source = "local"

    def detect(self, image_path: str, objects: str) -> Tuple[Image.Image, List[Dict[str, Any]]]:
        """Run detection on an image file for the given object prompt.

        Parameters:
        - image_path: Path to the image on disk.
        - objects: A comma-separated list of object names used as prompt.

        Returns:
        - A tuple of `(image, detections)`, where `image` is the loaded
          `PIL.Image.Image`, and `detections` is a list of dictionaries
          as returned by the underlying model. Each dictionary is expected
          to contain normalized bounding box coordinates and an optional
          `label` field.
        """
        image = Image.open(image_path)
        result = self.model.detect(image, objects)
        detections = result.get("objects", [])
        return image, detections

    def caption(self, image_path: str, length: str = "short") -> Tuple[Image.Image, str]:
        """Generate a caption for an image.

        Handles SDKs that may return streaming/generator captions by
        materializing them into a single string.
        """
        image = Image.open(image_path)
        # Moondream caption API: caption(image, length="short")
        result = self.model.caption(image, length=length)
        # Result is expected to be a dict like {"caption": <str or generator>}
        cap = ""
        try:
            cap = result.get("caption", "")  # type: ignore[assignment]
        except AttributeError:
            # Some SDKs may return the caption directly
            cap = result  # type: ignore[assignment]

        if isinstance(cap, str):
            text = cap
        else:
            # Try to join iterable/generator outputs
            try:
                text = "".join(part for part in cap)
            except Exception:
                text = str(cap)

        return image, text
