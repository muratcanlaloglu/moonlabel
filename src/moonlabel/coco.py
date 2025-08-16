from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

from .types import Detection


def _clamp_pair(x0: float, y0: float, x1: float, y1: float, w: int, h: int) -> Tuple[float, float, float, float]:
    x0 = max(0.0, min(float(x0), float(w)))
    y0 = max(0.0, min(float(y0), float(h)))
    x1 = max(0.0, min(float(x1), float(w)))
    y1 = max(0.0, min(float(y1), float(h)))
    if x1 < x0:
        x0, x1 = x1, x0
    if y1 < y0:
        y0, y1 = y1, y0
    return x0, y0, x1, y1


@dataclass
class CocoWriter:
    images: List[Dict] = field(default_factory=list)
    annotations: List[Dict] = field(default_factory=list)
    next_image_id: int = 1
    next_ann_id: int = 1

    def add_image(
        self,
        file_name: str,
        size: Tuple[int, int],
        detections: Iterable[Detection],
        class_to_id: Dict[str, int],
    ) -> None:
        width, height = size
        image_id = self.next_image_id
        self.next_image_id += 1

        self.images.append({
            "id": image_id,
            "file_name": file_name,
            "width": width,
            "height": height,
        })

        for det in detections:
            x0, y0, x1, y1 = _clamp_pair(det.x_min, det.y_min, det.x_max, det.y_max, width, height)
            w = max(0.0, x1 - x0)
            h = max(0.0, y1 - y0)
            if w <= 0 or h <= 0:
                continue

            ann = {
                "id": self.next_ann_id,
                "image_id": image_id,
                "category_id": int(class_to_id.get(det.label, 0)) + 1,
                "bbox": [x0, y0, w, h],
                "area": float(w * h),
                "iscrowd": 0,
            }
            self.next_ann_id += 1
            self.annotations.append(ann)

    def write(self, out_path: Path, class_to_id: Dict[str, int]) -> None:
        categories = [
            {"id": idx + 1, "name": name}
            for name, idx in sorted(class_to_id.items(), key=lambda kv: kv[1])
        ]
        data = {
            "images": self.images,
            "annotations": self.annotations,
            "categories": categories,
        }
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

