from typing import List, Tuple, Optional

import moondream as md
from PIL import Image
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# Lazily-loaded global handle so we only download / load the HF model once per
# process.  Initialised on first local inference request.
_HF_MODEL = None

class MoonDreamInference:
    """Wrapper around the Moondream visual-language model.

    The constructor selects the underlying engine automatically:

    * **Cloud** – If an ``api_key`` is supplied, we call Moondream Cloud just
      like before using ``moondream.vl``.
    * **Local** – If no key is given, we load the open-source checkpoints from
      Hugging Face (`vikhyatk/moondream2`).  The first request will therefore
      trigger a download  and subsequent requests reuse the singleton
      model stored in ``_HF_MODEL``.
    """

    def __init__(self, api_key: Optional[str] = None, station_endpoint: Optional[str] = None):
        # Cloud path when a key is provided
        if api_key and api_key.strip():
            self.model = md.vl(api_key=api_key)
            self.source = "cloud"

        elif station_endpoint and station_endpoint.strip():
            self.model = md.vl(endpoint=station_endpoint)
            self.source = "station"
        else:
            # Local HuggingFace model path
            global _HF_MODEL
            if _HF_MODEL is None:
                from transformers import AutoModelForCausalLM  # heavy import – defer
                import torch, os

                # Determine target device:
                # 1. Explicit override via env var ("cuda", "mps", "cpu")
                env_device = os.getenv("MOONDREAM_DEVICE", "").lower()

                if env_device:
                    device_target = env_device
                else:
                    # Auto-detect: CUDA → MPS → CPU
                    if torch.cuda.is_available():
                        device_target = "cuda"
                    elif torch.backends.mps.is_available():
                        device_target = "mps"
                    else:
                        device_target = "cpu"

                device_map_arg = {"": device_target} if device_target != "cpu" else None

                _HF_MODEL = AutoModelForCausalLM.from_pretrained(
                    "vikhyatk/moondream2",
                    revision="2025-06-21",
                    trust_remote_code=True,
                    device_map=device_map_arg,
                )
            self.model = _HF_MODEL
            self.source = "local"

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

    