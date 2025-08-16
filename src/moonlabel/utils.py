from __future__ import annotations

from pathlib import Path
from typing import Iterable, Optional


def iter_image_files(root: Path) -> Iterable[Path]:
    exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    for p in sorted(root.rglob("*")):
        if p.suffix.lower() in exts and p.is_file():
            yield p


try:
    from tqdm.auto import tqdm as _tqdm
except Exception:
    _tqdm = None


def progress_iter(iterable, total: Optional[int], desc: str, enabled: bool):
    if enabled and _tqdm is not None:
        return _tqdm(iterable, total=total, desc=desc, dynamic_ncols=True)
    return iterable

