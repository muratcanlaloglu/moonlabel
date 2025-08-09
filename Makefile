.PHONY: ui-build ui-embed release

ui-build:
	cd ui && npm ci && npm run build

ui-embed:
	/usr/bin/python3 scripts/embed_ui.py

release: ui-build ui-embed
	/usr/bin/python3 -m build
	@echo "Artifacts in ./dist"


