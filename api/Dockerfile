# Build from api folder:
#   docker build -t rxlens-api ./api
#   docker run --rm -p 4000:4000 -e GEMINI_API_KEY=... -e MOCK_AI=false rxlens-api

FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=4000 \
    MOCK_AI=false \
    KB_PATH=/data/medicines/bd_medicines_enriched.json

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY data/medicines /data/medicines

EXPOSE 4000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
