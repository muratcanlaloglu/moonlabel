from pathlib import Path
import io
import json
import zipfile
import os
from importlib.resources import files as resource_files
from tempfile import NamedTemporaryFile
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response

from ..infer import MoonDreamInference
from PIL import Image


app = FastAPI()


@app.post("/api/detect")
async def detect(
    image: UploadFile = File(...),
    objects: List[str] = Form(...),
    api_key: Optional[str] = Form(None),
    station_endpoint: Optional[str] = Form(None),
):
    try:
        suffix = Path(image.filename).suffix or ".jpg"
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await image.read())
            tmp_path = Path(tmp.name)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read image file: {exc}")

    try:
        detector = MoonDreamInference(api_key=api_key, station_endpoint=station_endpoint)
        image_pil, detections = detector.detect(str(tmp_path), ",".join(objects))
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass

    yolo = []
    for det in detections:
        x_min = det["x_min"]
        y_min = det["y_min"]
        x_max = det["x_max"]
        y_max = det["y_max"]
        x_c = (x_min + x_max) / 2.0
        y_c = (y_min + y_max) / 2.0
        bw = x_max - x_min
        bh = y_max - y_min
        label = det.get("label") or (objects[0] if len(objects) == 1 else "object")
        yolo.append({
            "label": label,
            "x_center": x_c,
            "y_center": y_c,
            "width": bw,
            "height": bh,
        })

    return {"detections": yolo}


@app.post("/api/export")
async def export_dataset(
    export_format: str = Form(...),  # 'yolo' | 'voc' | 'coco'
    annotations: str = Form(...),  # JSON: { filename: [{label,x_center,y_center,width,height}, ...] }
    classes: str | None = Form(None),  # JSON: ["class1", "class2", ...]
    images: list[UploadFile] = File(...),
):
    # Validate format
    if export_format not in {"yolo", "voc", "coco"}:
        raise HTTPException(status_code=400, detail="Invalid export_format; expected yolo|voc|coco")

    try:
        ann_map = json.loads(annotations or "{}")
        if not isinstance(ann_map, dict):
            raise ValueError("annotations must be a JSON object")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid annotations JSON: {exc}")

    if classes:
        try:
            class_list = json.loads(classes)
            if not isinstance(class_list, list):
                raise ValueError("classes must be a JSON array")
            class_list = [str(x) for x in class_list]
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid classes JSON: {exc}")
    else:
        # derive from annotations order of first occurrence
        seen = []
        for v in ann_map.values():
            if isinstance(v, list):
                for det in v:
                    lbl = str(det.get("label", "object"))
                    if lbl not in seen:
                        seen.append(lbl)
        class_list = seen or ["object"]

    label_to_index = {lbl: idx for idx, lbl in enumerate(class_list)}

    # Load images into memory, capture sizes
    image_blobs: dict[str, bytes] = {}
    image_sizes: dict[str, tuple[int, int]] = {}
    for up in images:
        content = await up.read()
        image_blobs[up.filename] = content
        try:
            with Image.open(io.BytesIO(content)) as im:
                image_sizes[up.filename] = (im.width, im.height)
        except Exception:
            image_sizes[up.filename] = (0, 0)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        # Always include images
        for name, blob in image_blobs.items():
            zf.writestr(f"images/{name}", blob)

        if export_format == "yolo":
            # labels/*.txt using normalized values directly
            for name, dets in ann_map.items():
                base = Path(name).with_suffix("").name
                if not isinstance(dets, list):
                    continue
                lines = []
                for det in dets:
                    try:
                        cls_id = label_to_index.get(str(det.get("label", "object")), 0)
                        xc = float(det.get("x_center"))
                        yc = float(det.get("y_center"))
                        w = float(det.get("width"))
                        h = float(det.get("height"))
                        lines.append(f"{cls_id} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}")
                    except Exception:
                        continue
                zf.writestr(f"labels/{base}.txt", "\n".join(lines))

            # data.yaml
            yaml_lines = [
                "path: .",
                "train: images",
                "val: images",
                "test: images",
                "",
                "names:",
                *[f"  {idx}: {name}" for idx, name in enumerate(class_list)],
            ]
            zf.writestr("data.yaml", "\n".join(yaml_lines))

        elif export_format == "voc":
            # annotations/*.xml using pixel coordinates
            for name, dets in ann_map.items():
                base = Path(name).with_suffix("").name
                w, h = image_sizes.get(name, (0, 0))
                depth = 3
                parts = [
                    "<?xml version=\"1.0\" encoding=\"utf-8\"?>",
                    "<annotation>",
                    "<folder>annotations</folder>",
                    f"<filename>{name}</filename>",
                    "<size>",
                    f"<width>{w}</width>",
                    f"<height>{h}</height>",
                    f"<depth>{depth}</depth>",
                    "</size>",
                    "<segmented>0</segmented>",
                ]
                if isinstance(dets, list) and w > 0 and h > 0:
                    for det in dets:
                        try:
                            lbl = str(det.get("label", "object"))
                            x0 = max(0.0, min((float(det["x_center"]) - float(det["width"]) / 2) * w, w))
                            y0 = max(0.0, min((float(det["y_center"]) - float(det["height"]) / 2) * h, h))
                            x1 = max(0.0, min((float(det["x_center"]) + float(det["width"]) / 2) * w, w))
                            y1 = max(0.0, min((float(det["y_center"]) + float(det["height"]) / 2) * h, h))
                            xmin = max(0, min(w - 1, int(min(x0, x1))))
                            ymin = max(0, min(h - 1, int(min(y0, y1))))
                            xmax = max(1, min(w, int(max(x0, x1))))
                            ymax = max(1, min(h, int(max(y0, y1))))
                            if xmax <= xmin or ymax <= ymin:
                                continue
                            parts += [
                                "<object>",
                                f"<name>{lbl}</name>",
                                "<pose>Unspecified</pose>",
                                "<truncated>0</truncated>",
                                "<difficult>0</difficult>",
                                "<bndbox>",
                                f"<xmin>{xmin}</xmin>",
                                f"<ymin>{ymin}</ymin>",
                                f"<xmax>{xmax}</xmax>",
                                f"<ymax>{ymax}</ymax>",
                                "</bndbox>",
                                "</object>",
                            ]
                        except Exception:
                            continue
                parts.append("</annotation>")
                zf.writestr(f"annotations/{base}.xml", "".join(parts))

        else:  # coco
            images_json: list[dict] = []
            annotations_json: list[dict] = []
            next_image_id = 1
            next_ann_id = 1
            for name, blob in image_blobs.items():
                w, h = image_sizes.get(name, (0, 0))
                img_id = next_image_id
                next_image_id += 1
                images_json.append({"id": img_id, "file_name": name, "width": w, "height": h})
                dets = ann_map.get(name, [])
                if isinstance(dets, list) and w > 0 and h > 0:
                    for det in dets:
                        try:
                            x0 = max(0.0, min((float(det["x_center"]) - float(det["width"]) / 2) * w, w))
                            y0 = max(0.0, min((float(det["y_center"]) - float(det["height"]) / 2) * h, h))
                            x1 = max(0.0, min((float(det["x_center"]) + float(det["width"]) / 2) * w, w))
                            y1 = max(0.0, min((float(det["y_center"]) + float(det["height"]) / 2) * h, h))
                            bx = min(x0, x1)
                            by = min(y0, y1)
                            bw = max(0.0, abs(x1 - x0))
                            bh = max(0.0, abs(y1 - y0))
                            if bw <= 0 or bh <= 0:
                                continue
                            cat_id = label_to_index.get(str(det.get("label", "object")), 0) + 1
                            annotations_json.append({
                                "id": next_ann_id,
                                "image_id": img_id,
                                "category_id": cat_id,
                                "bbox": [bx, by, bw, bh],
                                "area": float(bw * bh),
                                "iscrowd": 0,
                            })
                            next_ann_id += 1
                        except Exception:
                            continue

            categories = [{"id": idx + 1, "name": name} for idx, name in enumerate(class_list)]
            instances = {"images": images_json, "annotations": annotations_json, "categories": categories}
            zf.writestr("annotations/instances.json", json.dumps(instances, indent=2))

        # common classes file
        zf.writestr("classes.txt", "\n".join(class_list))

    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=dataset.zip"},
    )


_pkg_static = resource_files("moonlabel.server").joinpath("static")
_fallback_dist = (Path(__file__).resolve().parents[3] / "ui" / "dist").resolve()

def _select_static_root() -> Path | None:
    # Prefer packaged static if it contains an index.html
    if _pkg_static.is_dir():
        pkg_index = Path(os.fspath(_pkg_static)) / "index.html"
        if pkg_index.exists():
            return Path(os.fspath(_pkg_static))
    # Fallback to local ui/dist for development
    if _fallback_dist.is_dir() and (_fallback_dist / "index.html").exists():
        return _fallback_dist
    return None

_static_root = _select_static_root()

if _static_root and _static_root.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(_static_root / "assets")),
        name="assets",
    )
    app.mount(
        "/favicon.ico",
        StaticFiles(directory=str(_static_root)),
        name="fav",
    )


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    if not (_static_root and _static_root.exists()):
        raise HTTPException(status_code=404, detail="Not Found")
    index_file = _static_root / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Not Found")

