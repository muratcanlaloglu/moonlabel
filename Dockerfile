FROM node:20-alpine AS frontend_builder


WORKDIR /app/frontend


COPY frontend/package*.json ./

RUN npm install


COPY frontend .
RUN npm run build


FROM python:3.11-slim AS backend

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH="/app/backend/src"

WORKDIR /app


RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libjpeg-dev && \
    rm -rf /var/lib/apt/lists/*


COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install -r backend/requirements.txt

COPY backend ./backend

COPY --from=frontend_builder /app/frontend/dist ./frontend/dist

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend.src.api:app", "--host", "0.0.0.0", "--port", "8000"] 