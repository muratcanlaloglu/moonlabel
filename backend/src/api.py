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
    api_key: str = Form(...),
):
    """Detect *objects* in the uploaded *image* using the Moondream API.

    Parameters
    ----------
    image : UploadFile
        Image file to analyse.
    objects : List[str]
        List of object labels to look for.
    api_key : str
        API key for Moondream Cloud.
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
    detector = MoonDreamInference(api_key=api_key)
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

if _frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="static")
else:
    # Avoid crashing in development when the frontend has not been built yet.
    import warnings

    warnings.warn(
        f"Frontend build directory not found at '{_frontend_dist}'. Static files will not be served.",
        RuntimeWarning,
    )
