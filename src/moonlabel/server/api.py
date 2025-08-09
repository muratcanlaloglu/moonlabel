from pathlib import Path
import os
from importlib.resources import files as resource_files
from tempfile import NamedTemporaryFile
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from ..infer import MoonDreamInference


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


