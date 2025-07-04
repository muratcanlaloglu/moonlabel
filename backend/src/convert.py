from dataclasses import dataclass

@dataclass
class Detection:
    label: str
    x_min: float
    y_min: float
    x_max: float
    y_max: float

    def to_yolo(self, image_width: int, image_height: int) -> tuple[int, int, int, int]:
        x_center = (self.x_min + self.x_max) / 2 / image_width
        y_center = (self.y_min + self.y_max) / 2 / image_height
        width = (self.x_max - self.x_min) / image_width
        height = (self.y_max - self.y_min) / image_height
        return x_center, y_center, width, height

