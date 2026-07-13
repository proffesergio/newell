# services/ai_gateway/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install shared lib first (better layer caching)
COPY libs/newell_common /app/libs/newell_common
RUN pip install --no-cache-dir -e /app/libs/newell_common

COPY services/ai_gateway /app/services/ai_gateway
RUN pip install --no-cache-dir -e /app/services/ai_gateway

EXPOSE 8000
CMD ["uvicorn", "ai_gateway.main:app", "--host", "0.0.0.0", "--port", "8000"]
