from __future__ import annotations

from pathlib import Path
from typing import Iterable, Tuple
from xml.etree.ElementTree import Element, SubElement, ElementTree

from .types import Detection


def _clamp(v: float, lo: int, hi: int) -> int:
    if v < lo:
        return lo
    if v > hi:
        return hi
    return int(v)


def write_voc_annotation(
    xml_path: Path,
    image_filename: str,
    image_size: Tuple[int, int, int],  # (width, height, depth)
    detections: Iterable[Detection],
) -> None:
    w, h, d = image_size

    root = Element("annotation")
    folder = SubElement(root, "folder")
    folder.text = xml_path.parent.name

    filename = SubElement(root, "filename")
    filename.text = image_filename

    size_el = SubElement(root, "size")
    w_el = SubElement(size_el, "width")
    w_el.text = str(w)
    h_el = SubElement(size_el, "height")
    h_el.text = str(h)
    d_el = SubElement(size_el, "depth")
    d_el.text = str(d)

    segmented = SubElement(root, "segmented")
    segmented.text = "0"

    for det in detections:
        xmin = _clamp(det.x_min, 0, w - 1)
        ymin = _clamp(det.y_min, 0, h - 1)
        xmax = _clamp(det.x_max, 1, w)
        ymax = _clamp(det.y_max, 1, h)
        if xmax <= xmin or ymax <= ymin:
            continue

        obj = SubElement(root, "object")
        name = SubElement(obj, "name")
        name.text = det.label
        pose = SubElement(obj, "pose")
        pose.text = "Unspecified"
        truncated = SubElement(obj, "truncated")
        truncated.text = "0"
        difficult = SubElement(obj, "difficult")
        difficult.text = "0"

        bnd = SubElement(obj, "bndbox")
        SubElement(bnd, "xmin").text = str(xmin)
        SubElement(bnd, "ymin").text = str(ymin)
        SubElement(bnd, "xmax").text = str(xmax)
        SubElement(bnd, "ymax").text = str(ymax)

    xml_path.parent.mkdir(parents=True, exist_ok=True)
    ElementTree(root).write(xml_path, encoding="utf-8", xml_declaration=True)

