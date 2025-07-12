from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import List, Optional

from convert import Detection as BBox
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles
from infer import MoonDreamInference
from models import DetectResponse, YoloDetection


app = FastAPI()


@app.post("/api/detect", response_model=DetectResponse)
async def detect(
    image: UploadFile = File(...),
    objects: List[str] = Form(...),
    api_key: Optional[str] = Form(None),
    station_endpoint: Optional[str] = Form(None),
):
    """Detect *objects* in the uploaded *image* using the Moondream API.

    Parameters
    ----------
    image : UploadFile
        Image file to analyse.
    objects : List[str]
        List of object labels to look for.
    api_key : str | None
        If provided, use Moondream Cloud with this key.  If omitted / empty,
        the server falls back to the local HuggingFace model.
    station_endpoint : str | None
        If provided, use Moondream Station at this endpoint.
        If both api_key and station_endpoint are omitted/empty,
        the server falls back to the local HuggingFace model.
    """

    # Persist the uploaded image to a temporary file so that Pillow can reopen it inside
    # ``MoonDreamInference`` (it expects a file path).
    try:
        suffix = Path(image.filename).suffix or ".jpg"
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await image.read())
            tmp_path = Path(tmp.name)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read image file: {exc}")

    # Perform inference
    detector = MoonDreamInference(api_key=api_key, station_endpoint=station_endpoint)
    image, detections = detector.detect(str(tmp_path), ",".join(objects))

    image_w, image_h = image.width, image.height

    # Convert each detection dictionary to YOLO format.
    yolo_dets: List[YoloDetection] = []

    # Determine default label when the API does not return one.
    default_label: Optional[str] = ",".join(objects) if len(objects) == 1 else "unknown"

    for det in detections:
        label = det.get("label", default_label)

        # Convert normalised coords (0-1) to pixel coordinates for converter
        x_min_px = det["x_min"] * image_w
        y_min_px = det["y_min"] * image_h
        x_max_px = det["x_max"] * image_w
        y_max_px = det["y_max"] * image_h

        bbox = BBox(label, x_min_px, y_min_px, x_max_px, y_max_px)
        x_c, y_c, w, h = bbox.to_yolo(image_w, image_h)

        yolo_dets.append(
            YoloDetection(
                label=label,
                x_center=x_c,
                y_center=y_c,
                width=w,
                height=h,
            )
        )

    # Clean up the temporary file
    try:
        tmp_path.unlink(missing_ok=True)
    except Exception:
        # Not critical if deletion fails – just log/ignore
        pass

    return {"detections": yolo_dets}


_frontend_dist = (Path(__file__).resolve().parents[2] / "frontend" / "dist").resolve()

# Serve built static assets under /assets while letting SPA routing fall back to index.html.
if _frontend_dist.exists():
    # JS/CSS chunks are under assets/, images etc.
    app.mount(
        "/assets",
        StaticFiles(directory=str(_frontend_dist / "assets")),
        name="assets",
    )
    # Also serve other top-level files like favicon etc.
    app.mount(
        "/favicon.ico",
        StaticFiles(directory=str(_frontend_dist)),
        name="fav",
    )
else:
    # Avoid crashing in development when the frontend has not been built yet.
    import warnings

    warnings.warn(
        f"Frontend build directory not found at '{_frontend_dist}'. Static files will not be served.",
        RuntimeWarning,
    )

# SPA fallback: serve index.html for any other route (except API routes)
from fastapi.responses import FileResponse


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    """Return the built SPA's index.html for any unmatched path.

    This allows React Router to handle client-side routing (e.g. /settings) while
    keeping backend API paths functional.
    """
    if not _frontend_dist.exists():
        raise HTTPException(status_code=404, detail="Not Found")

    index_file = _frontend_dist / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Not Found")
