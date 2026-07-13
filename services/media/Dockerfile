# services/media/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install shared lib first (better layer caching)
COPY libs/newell_common /app/libs/newell_common
RUN pip install --no-cache-dir -e /app/libs/newell_common

COPY services/media /app/services/media
RUN pip install --no-cache-dir -e /app/services/media

EXPOSE 8000
CMD ["uvicorn", "media.main:app", "--host", "0.0.0.0", "--port", "8000"]
