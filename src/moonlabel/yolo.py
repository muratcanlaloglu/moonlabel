from __future__ import annotations

from pathlib import Path
from typing import List, Tuple

from .types import Detection


def write_yolo_labels(
    txt_path: Path,
    detections: List[Detection],
    image_size: Tuple[int, int],
    class_to_id: dict[str, int],
) -> None:
    width, height = image_size
    with txt_path.open("w", encoding="utf-8") as f:
        for det in detections:
            x_c, y_c, w, h = det.to_yolo(width, height)
            class_id = class_to_id.get(det.label, 0)
            f.write(f"{class_id} {x_c:.6f} {y_c:.6f} {w:.6f} {h:.6f}\n")

