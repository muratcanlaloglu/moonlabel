from __future__ import annotations

import argparse
import webbrowser

import uvicorn


DEFAULT_HOST = "localhost"
DEFAULT_PORT = 8342  # fixed, uncommon port


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="moonlabel-ui",
        description="Start the MoonLabel UI (FastAPI + built UI)",
    )
    parser.add_argument("--host", default=DEFAULT_HOST, help=f"Bind address (default: {DEFAULT_HOST})")
    parser.add_argument("--reload", action="store_true", help="Enable auto reload (dev mode)")
    parser.add_argument("--no-open", action="store_true", help="Do not open the browser automatically")
    args = parser.parse_args()

    url = f"http://{args.host}:{DEFAULT_PORT}"
    if not args.no_open:
        try:
            webbrowser.open_new_tab(url)
        except Exception:
            pass

    uvicorn.run("moonlabel.server.api:app", host=args.host, port=DEFAULT_PORT, reload=args.reload)


