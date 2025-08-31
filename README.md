<div align="center">
  <h1>MoonLabel</h1>
  <img src="https://raw.githubusercontent.com/muratcanlaloglu/moonlabel/main/ui/src/assets/moonlabellogo.svg" alt="MoonLabel Logo" width="200" />
  <p>An object-detection and image-caption dataset tool.</p>
  <p><em>Powered by <a href="https://moondream.ai/">Moondream VLM</a></em></p>
  <p>
    <a href="https://pypi.org/project/moonlabel/"><img src="https://img.shields.io/pypi/v/moonlabel.svg?logo=pypi" alt="PyPI version"></a>
  </p>
</div>

---

## Overview

MoonLabel is both a Python library and a tiny web UI to generate object-detection and image-caption datasets quickly.

1. Use the library to auto-label folders of images and export YOLO, COCO, VOC, or Captions.
2. Or launch the UI, switch between Detection/Caption, and export with one click.

Backends supported: Moondream Cloud, Moondream Station, or fully local (Hugging Face).

## Demo


https://github.com/user-attachments/assets/a2dfc6b6-c83d-4296-986b-ac221e10fc3b


---

## Features

* 📦 **Library + UI** — `moonlabel` package with an optional web UI.
* 🌐 **FastAPI server** — Served by a single `moonlabel-ui` command.
* ⚛️ **Modern frontend** — React, TypeScript, TailwindCSS, Vite.
* 🖼️ **Object detection** — Choose between Moondream Cloud, the open-source Hugging Face model, or the native Moondream Station app.
* 📝 **Image caption datasets** — Export captions as `captions.jsonl` alongside images.
* ⚡ **GPU-accelerated & offline** — Local and Station modes automatically use available hardware acceleration (CUDA / MPS).


## Install

- Library only (Cloud/Station by default):
```bash
pip install moonlabel
```
- Library + UI server:
```bash
pip install "moonlabel[ui]"
```
- Local inference (Hugging Face) extras:
```bash
pip install "moonlabel[local]"
```
- Both UI and local inference:
```bash
pip install "moonlabel[ui,local]"
```

## Quick Start (UI)

```bash
pip install "moonlabel[ui]"
moonlabel-ui    # opens http://localhost:8342
```

Choose backend in Settings:
- Moondream Cloud: paste API key
- Moondream Station: set endpoint (default http://localhost:2020/v1)
- Local (Hugging Face): install local extras and select Local

In the Home page:
- Use the top toggle to select Detection or Caption dataset.
- For Caption, choose length (short/normal/long) and generate/export.

## Quick Start (Library)

```bash
from moonlabel import create_dataset

# Cloud
create_dataset("/path/to/images", objects=["person"], api_key="YOUR_API_KEY")

# Station
create_dataset("/path/to/images", objects=["car"], station_endpoint="http://localhost:2020/v1")

# Local (after: pip install "moonlabel[local]")
create_dataset("/path/to/images", objects=["bottle"])  # no key needed
```

By default this exports YOLO. Choose formats via `export_format`:

```python
# YOLO (default)
create_dataset("/path/to/images", objects=["person"], export_format="yolo")

# COCO
create_dataset("/path/to/images", objects=["person", "car"], export_format="coco")

# Pascal VOC
create_dataset("/path/to/images", objects=["cat", "dog"], export_format="voc")

# Image Captioning
create_dataset("/path/to/images", export_format="caption")
# With length (short|normal|long)
create_dataset("/path/to/images", export_format="caption", caption_length="normal")
```

Output layouts:
- YOLO: `images/`, `labels/`, `classes.txt`
- COCO: `images/`, `annotations/instances.json`, `classes.txt`
- VOC: `images/`, `annotations/*.xml`, `classes.txt`
- Caption: `images/`, `annotations/captions.jsonl`

## Moondream Station Mode

The backend can connect to a running [Moondream Station](https://moondream.ai/station) instance for fast, native, on-device inference.

1. Download, install, and run Moondream Station.
2. Ensure the endpoint matches your Station configuration (default: `http://localhost:2020/v1`).

## Local Mode (Hugging Face)

The backend can run fully offline using the open-source [vikhyatk/moondream2](https://huggingface.co/vikhyatk/moondream2) checkpoint.

1. `pip install "moonlabel[local]"`
2. In the UI, select Local (no API key required).

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

## Project Structure

```
moonlabel/
├── src/moonlabel/             # Python package (library + server)
│   ├── dataset.py             # create_dataset API
│   ├── infer.py               # Moondream wrapper (cloud/station/local)
│   ├── types.py               # shared types 
│   ├── utils.py               # helpers 
│   ├── yolo.py                # YOLO label writer
│   ├── coco.py                # COCO writer
│   ├── voc.py                 # Pascal VOC XML writer
│   └── server/                # FastAPI app + static assets
│       ├── api.py
│       ├── cli.py             # moonlabel-ui entrypoint (port 8342)
│       └── static/            # embedded UI build (no npm for users)
├── ui/                        # Frontend source (for maintainers)
│   └── dist/                  # Built files to embed
├── scripts/embed_ui.py        # Copies ui/dist → src/moonlabel/server/static
├── Makefile                   # make ui-build, ui-embed, release
└── pyproject.toml
```

---

## Roadmap / TODOs

Below are planned enhancements and upcoming features. Contributions welcome!

- [x] **Local Hugging Face model support** – Offline inference with optional GPU acceleration.
- [x] **Moondream Station integration** – Native Mac/Linux app support for on-device inference.
- [x] **Batch uploads** – Label multiple images in one go, with progress tracking.
- [x] **Additional export formats** – COCO JSON and Pascal VOC alongside YOLO.

---

## License

This project is licensed under the terms of the Apache License 2.0. See [LICENSE](LICENSE) for details.
