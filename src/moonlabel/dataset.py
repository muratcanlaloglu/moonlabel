from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Literal, Optional, Sequence, Tuple

from PIL import Image

from .infer import MoonDreamInference


@dataclass
class Detection:
    label: str
    x_min: float
    y_min: float
    x_max: float
    y_max: float

    def to_yolo(self, image_width: int, image_height: int) -> Tuple[float, float, float, float]:
        x_center = (self.x_min + self.x_max) / 2 / image_width
        y_center = (self.y_min + self.y_max) / 2 / image_height
        width = (self.x_max - self.x_min) / image_width
        height = (self.y_max - self.y_min) / image_height
        return x_center, y_center, width, height


ExportFormat = Literal["yolo"]


def _iter_image_files(root: Path) -> Iterable[Path]:
    exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    for p in sorted(root.rglob("*")):
        if p.suffix.lower() in exts and p.is_file():
            yield p


try:  # optional progress bar dependency
    from tqdm.auto import tqdm as _tqdm
except Exception:  # noqa: S110 - optional
    _tqdm = None


def _progress_iter(iterable: Iterable[Path], total: Optional[int], desc: str, enabled: bool) -> Iterable[Path]:
    if enabled and _tqdm is not None:
        return _tqdm(iterable, total=total, desc=desc, dynamic_ncols=True)
    return iterable


def _write_yolo_labels(
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


def create_dataset(
    images_dir: str | Path,
    export_format: ExportFormat = "yolo",
    output_dir: Optional[str | Path] = "moonlabel_out_dataset",
    objects: Sequence[str] = (),
    api_key: Optional[str] = None,
    station_endpoint: Optional[str] = None,
    show_progress: bool = True,
) -> Path:
    images_root = Path(images_dir).resolve()
    if not images_root.exists() or not images_root.is_dir():
        raise FileNotFoundError(f"Images directory not found: {images_root}")

    if output_dir is None:
        output_root = images_root / "moonlabel_out"
    else:
        output_root = Path(output_dir).resolve()
    output_root.mkdir(parents=True, exist_ok=True)

    if export_format != "yolo":
        raise ValueError("Only 'yolo' export_format is supported at the moment")

    images_out = output_root / "images"
    labels_out = output_root / "labels"
    images_out.mkdir(exist_ok=True)
    labels_out.mkdir(exist_ok=True)

    prompt_objects = ",".join(objects) if objects else "object"

    infer = MoonDreamInference(api_key=api_key, station_endpoint=station_endpoint)

    processed = 0
    labels_list: List[str] = list(objects) if objects else ["object"]
    class_to_id: dict[str, int] = {label: idx for idx, label in enumerate(labels_list)}
    image_paths = list(_iter_image_files(images_root))
    for img_path in _progress_iter(image_paths, total=len(image_paths), desc="Creating dataset", enabled=show_progress):
        image = Image.open(img_path)
        width, height = image.width, image.height

        _, dets_raw = infer.detect(str(img_path), prompt_objects)

        detections: List[Detection] = []
        for d in dets_raw:
            label = d.get("label") or prompt_objects
            x_min = float(d["x_min"]) * width
            y_min = float(d["y_min"]) * height
            x_max = float(d["x_max"]) * width
            y_max = float(d["y_max"]) * height
            detections.append(Detection(label, x_min, y_min, x_max, y_max))
            if label not in class_to_id:
                class_to_id[label] = len(labels_list)
                labels_list.append(label)

        txt_name = img_path.with_suffix(".txt").name
        _write_yolo_labels(labels_out / txt_name, detections, (width, height), class_to_id)

        target_img = images_out / img_path.name
        if not target_img.exists():
            try:
                import os
                os.link(img_path, target_img)
            except Exception:
                from shutil import copy2
                copy2(img_path, target_img)

        processed += 1

    if processed == 0:
        raise RuntimeError(f"No images found under {images_root}")

    classes_file = output_root / "classes.txt"
    with classes_file.open("w", encoding="utf-8") as f:
        for label in labels_list:
            f.write(label + "\n")

    return output_root


