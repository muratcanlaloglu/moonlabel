from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Sequence, Dict
import json

from PIL import Image
from .types import Detection, ExportFormat
from .utils import iter_image_files, progress_iter
from .yolo import write_yolo_labels
from .voc import write_voc_annotation
from .coco import CocoWriter


def create_dataset(
    images_dir: str | Path,
    export_format: ExportFormat = "yolo",
    output_dir: Optional[str | Path] = "moonlabel_out_dataset",
    objects: Sequence[str] = (),
    api_key: Optional[str] = None,
    station_endpoint: Optional[str] = None,
    show_progress: bool = True,
    caption_length: str = "short",
) -> Path:
    """Create an object detection dataset from images using Moondream.

    Parameters:
    - images_dir: Directory containing images to annotate.
    - export_format: yolo, voc, coco, or caption.
    - output_dir: Output directory for images/labels (created if missing). If None, defaults under images_dir.
    - objects: Sequence of class names to prompt the model with; defaults to a generic "object".
    - api_key: API key for Moondream cloud inference.
    - station_endpoint: URL for a local Station endpoint.
    - show_progress: Whether to show a tqdm progress bar when available.
    - caption_length: One of "short", "normal", or "long" (caption export only).

    Returns:
    - Path to the dataset root that contains `images/`, `labels/` and `classes.txt`.
    """
    images_root = Path(images_dir).resolve()
    if not images_root.exists() or not images_root.is_dir():
        raise FileNotFoundError(f"Images directory not found: {images_root}")

    if output_dir is None:
        output_root = images_root / "moonlabel_out"
    else:
        output_root = Path(output_dir).resolve()
    output_root.mkdir(parents=True, exist_ok=True)

    images_out = output_root / "images"
    images_out.mkdir(exist_ok=True)

    # Prepare per-format outputs
    labels_out = output_root / "labels"  # YOLO
    annotations_out = output_root / "annotations"  # VOC XMLs or COCO JSON
    if export_format == "yolo":
        labels_out.mkdir(exist_ok=True)
    else:
        annotations_out.mkdir(exist_ok=True)

    # Lazy import to avoid pulling heavy deps at module import time
    from .infer import MoonDreamInference
    infer = MoonDreamInference(api_key=api_key, station_endpoint=station_endpoint)

    processed = 0
    labels_list: List[str] = list(objects) if objects else ["object"]
    class_to_id: dict[str, int] = {label: idx for idx, label in enumerate(labels_list)}

    coco: CocoWriter | None = None
    if export_format == "coco":
        coco = CocoWriter()
    # For caption export, collect entries to write at the end
    caption_entries: List[Dict[str, str]] = []
    image_paths = list(iter_image_files(images_root))
    for img_path in progress_iter(image_paths, total=len(image_paths), desc="Creating dataset", enabled=show_progress):
        image = Image.open(img_path)
        width, height = image.width, image.height

        if export_format == "caption":
            # Moondream caption API uses only the length parameter.
            _, cap_text = infer.caption(str(img_path), length=caption_length)
            caption_entries.append({"image": img_path.name, "caption": cap_text})
        else:
            detections: List[Detection] = []
            if objects:
                
                for obj in objects:
                    _, dets_raw = infer.detect(str(img_path), obj)
                    for d in dets_raw:
                        label = d.get("label") or obj
                        x_min = float(d["x_min"]) * width
                        y_min = float(d["y_min"]) * height
                        x_max = float(d["x_max"]) * width
                        y_max = float(d["y_max"]) * height
                        detections.append(Detection(label, x_min, y_min, x_max, y_max))
                        if label not in class_to_id:
                            class_to_id[label] = len(labels_list)
                            labels_list.append(label)
            else:
                # Fallback: generic object prompt in a single pass
                _, dets_raw = infer.detect(str(img_path), "object")
                for d in dets_raw:
                    label = d.get("label") or "object"
                    x_min = float(d["x_min"]) * width
                    y_min = float(d["y_min"]) * height
                    x_max = float(d["x_max"]) * width
                    y_max = float(d["y_max"]) * height
                    detections.append(Detection(label, x_min, y_min, x_max, y_max))
                    if label not in class_to_id:
                        class_to_id[label] = len(labels_list)
                        labels_list.append(label)

            if export_format == "yolo":
                txt_name = img_path.with_suffix(".txt").name
                write_yolo_labels(labels_out / txt_name, detections, (width, height), class_to_id)
            elif export_format == "voc":
                depth = 4 if image.mode == "RGBA" else (3 if image.mode in {"RGB", "P"} else 1)
                xml_name = img_path.with_suffix(".xml").name
                write_voc_annotation(
                    annotations_out / xml_name,
                    img_path.name,
                    (width, height, depth),
                    detections,
                )
            elif export_format == "coco":
                assert coco is not None
                coco.add_image(img_path.name, (width, height), detections, class_to_id)

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

    if export_format == "coco":
        assert coco is not None
        coco.write(annotations_out / "instances.json", class_to_id)

    if export_format == "caption":
        captions_file = annotations_out / "captions.jsonl"
        with captions_file.open("w", encoding="utf-8") as f:
            for entry in caption_entries:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        return output_root

    classes_file = output_root / "classes.txt"
    with classes_file.open("w", encoding="utf-8") as f:
        for label in labels_list:
            f.write(label + "\n")

    return output_root
