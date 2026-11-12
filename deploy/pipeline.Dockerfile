# The pipeline (Connectors, rebuild). One-shot: `docker compose run --rm pipeline rebuild`.
# Build from the repo root:  docker compose build pipeline
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
# restic (the backup steps, #82) and a pg_dump/pg_restore that matches the db image's major version (18; PGDG, Debian's own is older)
RUN apt-get update && apt-get install -y --no-install-recommends restic ca-certificates curl gnupg \
 && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg \
 && . /etc/os-release && echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update && apt-get install -y --no-install-recommends postgresql-client-18 \
 && apt-get purge -y curl gnupg && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY watchdog/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY watchdog/pipeline ./pipeline
ENTRYPOINT ["python", "-m", "pipeline"]
CMD ["rebuild"]
