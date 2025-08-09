from __future__ import annotations

from typing import List, Tuple, Optional

import moondream as md
from PIL import Image

_HF_MODEL = None


class MoonDreamInference:
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
                    from transformers import AutoModelForCausalLM
                    import torch
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

    def detect(self, image_path: str, objects: str) -> Tuple[Image.Image, List[dict]]:
        image = Image.open(image_path)
        result = self.model.detect(image, objects)
        detections = result.get("objects", [])
        return image, detections


