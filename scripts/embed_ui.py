from __future__ import annotations

import shutil
from pathlib import Path


def copy_tree(src: Path, dst: Path) -> None:
    for item in src.iterdir():
        target = dst / item.name
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            copy_tree(item, target)
        else:
            shutil.copy2(item, target)


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    ui_dist = repo_root / "ui" / "dist"
    static_root = repo_root / "src" / "moonlabel" / "server" / "static"

    if not ui_dist.is_dir() or not (ui_dist / "index.html").exists():
        raise SystemExit(f"UI build not found at {ui_dist}. Run 'npm ci && npm run build' in ./ui first.")

    static_root.mkdir(parents=True, exist_ok=True)

    # Clean current static except for a sentinel .keep if present
    for entry in list(static_root.iterdir()):
        if entry.name == ".keep":
            continue
        if entry.is_dir():
            shutil.rmtree(entry)
        else:
            entry.unlink()

    copy_tree(ui_dist, static_root)
    print(f"Embedded UI from {ui_dist} into {static_root}")


if __name__ == "__main__":
    main()


