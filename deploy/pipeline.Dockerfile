# The pipeline (Connectors, rebuild). One-shot: `docker compose run --rm pipeline rebuild`.
# Build from the repo root:  docker compose build pipeline
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY watchdog/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY watchdog/pipeline ./pipeline
ENTRYPOINT ["python", "-m", "pipeline"]
CMD ["rebuild"]
