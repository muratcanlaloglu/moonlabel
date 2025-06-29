import moondream as md
from PIL import Image
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from typing import List, Tuple


class MoonDreamInference:
    """Wrapper around the Moondream VL model to detect objects in an image
    and optionally visualise the detections.
    """

    def __init__(self, api_key: str):
        """Initialise the Moondream model with the provided API key."""
        # Option A: Moondream Cloud
        self.model = md.vl(api_key=api_key)

    def detect(self, image_path: str, objects: str) -> Tuple[Image.Image, List[dict]]:
        """Detect the specified objects in the given image.

        Parameters
        ----------
        image_path : str
            Path to the image file.
        objects : str
            Comma-separated list of objects to look for.
        Returns
        -------
        (image, detections) : Tuple[Image.Image, List[dict]]
            PIL image instance and list of detection dictionaries returned by the API.
        """
        image = Image.open(image_path)
        result = self.model.detect(image, objects)
        detections = result.get("objects", [])
        return image, detections

    def visualise(
        self,
        image: Image.Image,
        detections: List[dict],
        objects: str,
        output_path: str = "output_with_detections.jpg",
    ) -> None:
        """Draw bounding boxes for detected objects, save and display the image.

        Parameters
        ----------
        image : PIL.Image.Image
            The image to annotate.
        detections : List[dict]
            Detections as returned by :py:meth:`detect`.
        objects : str
            Label to write next to each bounding box.
        output_path : str, optional
            File path where the annotated image will be saved.
        """
        plt.figure(figsize=(10, 10))
        plt.imshow(image)
        ax = plt.gca()

        for obj in detections:
            # Convert normalized coordinates to pixel values
            x_min = obj["x_min"] * image.width
            y_min = obj["y_min"] * image.height
            x_max = obj["x_max"] * image.width
            y_max = obj["y_max"] * image.height

            width = x_max - x_min
            height = y_max - y_min

            # Draw rectangle
            rect = patches.Rectangle(
                (x_min, y_min),
                width,
                height,
                linewidth=2,
                edgecolor="r",
                facecolor="none",
            )
            ax.add_patch(rect)
            plt.text(
                x_min,
                y_min,
                objects,
                color="white",
                fontsize=12,
                bbox=dict(facecolor="red", alpha=0.5),
            )

        plt.axis("off")
        plt.savefig(output_path)
        plt.show()


if __name__ == "__main__":
    """Command-line helper for quick local testing.

    Example
    -------
    python -m backend.src.infer detect.jpg person YOUR_API_KEY
    """
    import argparse

    parser = argparse.ArgumentParser(
        description="Detect objects in an image using the Moondream API and visualise the results."
    )
    parser.add_argument("image_path", help="Path to the input image.")
    parser.add_argument("objects", help="Comma-separated list of objects to detect.")
    parser.add_argument("api_key", help="Moondream API key.")
    parser.add_argument(
        "--output",
        default="output_with_detections.jpg",
        help="Path where the annotated image will be saved.",
    )

    args = parser.parse_args()

    detector = MoonDreamInference(api_key=args.api_key)
    img, dets = detector.detect(args.image_path, args.objects)

    print(f"Found {len(dets)} {args.objects} in the image.")
    for d in dets:
        print(d)

    detector.visualise(img, dets, args.objects, output_path=args.output)

    