<div align="center">
  <h1>MoonLabel</h1>
  <img src="frontend/src/assets/moonlabellogo.png" alt="MoonLabel Logo" width="200" />
  <p>An object-detection labelling tool.</p>
  <p><em>Powered by <a href="https://moondream.ai/">Moondream VLM</a></em></p>
</div>

---

## Overview

MoonLabel is a lightweight image-annotation tool that streamlines the process of generating training data for computer-vision models.

1. **Upload an image** and list the object classes you're interested in.
2. The backend queries the **Moondream VLM** to detect those objects and returns bounding-box coordinates.
3. The frontend overlays the boxes for quick visual review and lets you **export YOLO-format labels** (image + labels + data.yaml) in a single ZIP file.

This makes it easy to build datasets for object detection and other computer-vision research or application areas without setting up a heavy annotation pipeline.

## Demo

https://github.com/user-attachments/assets/ced0beeb-9f2a-498e-b6fc-406efb16b17d

---

## Features

* 🌐 **API-driven backend** — FastAPI with automatic OpenAPI docs.
* ⚛️ **Modern frontend** — React 19, TypeScript, TailwindCSS, Vite.
* 🖼️ **Object detection** — Choose between Moondream Cloud, the open-source Hugging Face model, or the native Moondream Station app.
* ⚡ **GPU-accelerated & offline** — Local and Station modes automatically use available hardware acceleration (CUDA / MPS).
* 🐳 **Docker-first** — Single-command build & run.

## Project Structure

```
moonlabel/
├── backend/      # FastAPI application & inference logic
│   ├── src/
│   └── requirements.txt
├── frontend/     # React + Vite SPA
│   ├── src/
│   └── public/
├── Dockerfile    # Multi-stage build (frontend → backend)
└── README.md
```

## Prerequisites

* **Docker** ≥ 20.10 _(recommended)_
* Otherwise: Node.js ≥ 20 & Python ≥ 3.11 if running without Docker.
* **PyTorch** – Installed automatically via `pip install -r backend/requirements.txt`.
  * GPU users: make sure you have the matching CUDA runtime; Apple Silicon users need PyTorch ≥ 2.1 with MPS enabled.
* **Moondream API key** _(Cloud mode only)_ — Sign up for a free key following the [Moondream Quickstart](https://moondream.ai/c/docs/quickstart) guide. You'll enter this key on the app's **Settings** page.
* **Moondream Station** _(Station mode only)_ - [Download and install](https://moondream.ai/station) the native app for Mac or Linux.

## Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/muratcanlaloglu/moonlabel.git
cd moonlabel

# Build the image
docker build -t moonlabel .

# Run the container (frontend + API on port 8000)
docker run -p 8000:8000 moonlabel
```

Visit http://localhost:8000 to open the web UI.

## Moondream Station Mode

The backend can connect to a running [Moondream Station](https://moondream.ai/station) instance for fast, native, on-device inference.

1.  Download, install, and run Moondream Station.
2.  Follow **Local Development → Backend** below to start the API.
3.  Open the **Settings** page in the UI and select **Moondream Station**.
4.  Ensure the endpoint matches your Station configuration (default: `http://localhost:2020/v1`).
5.  Click "Save Settings" and return to the Home page.

## Local Mode (Hugging Face)

The backend can run fully offline using the open-source [vikhyatk/moondream2](https://huggingface.co/vikhyatk/moondream2) checkpoint.

1. Follow **Local Development → Backend** below to start the API.
2. Open the **Settings** page in the UI and select **Local (Hugging Face)**.
3. Click "Save Settings" (no API key required) and return to the Home page.

The first detection will trigger a one-off model download to `~/.cache/huggingface/`; subsequent runs reuse the cached weights.

### GPU / Device selection

The backend chooses the best device automatically in the following order: CUDA → Apple Silicon (MPS) → CPU.

Override via environment variable before launching the backend:

```bash
# Force GPU
export MOONDREAM_DEVICE=cuda

# Force Apple Silicon
export MOONDREAM_DEVICE=mps

# CPU only
export MOONDREAM_DEVICE=cpu
```

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.api:app --reload
```

### Frontend

For **development** (fast HMR reloads):

```bash
cd frontend
npm install
npm run dev  # Starts Vite dev server on http://localhost:5173
```

For a **production** build that's served by the backend:

```bash
cd frontend
npm install  # if not done already
npm run build  # Creates static files under frontend/dist
```

Restart the backend after building; `backend/src/api.py` automatically serves everything under `frontend/dist` at http://localhost:8000.

---

## Roadmap / TODOs

Below are planned enhancements and upcoming features. Contributions welcome!

- [x] **Local Hugging Face model support** – Offline inference with optional GPU acceleration.
- [x] **Moondream Station integration** – Native Mac/Linux app support for on-device inference.
- [ ] **Batch uploads** – Label multiple images in one go, with progress tracking.
- [ ] **Additional export formats** – COCO JSON and Pascal VOC alongside YOLO.

---

## License

This project is licensed under the terms of the Apache License 2.0. See [LICENSE](LICENSE) for details.

