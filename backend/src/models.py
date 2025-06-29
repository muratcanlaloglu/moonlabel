from pydantic import BaseModel
from typing import List

class YoloDetection(BaseModel):
    label: str
    x_center: float
    y_center: float
    width: float
    height: float


class DetectResponse(BaseModel):
    detections: List[YoloDetection]