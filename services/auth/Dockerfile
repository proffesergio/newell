# services/auth/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install shared lib first (better layer caching)
COPY libs/newell_common /app/libs/newell_common
RUN pip install --no-cache-dir -e /app/libs/newell_common

COPY services/auth /app/services/auth
RUN pip install --no-cache-dir -e /app/services/auth

# i18n catalogs: newell_common.i18n.translate reads locales/ relative to CWD.
COPY locales /app/locales

EXPOSE 8000
CMD ["uvicorn", "auth.main:app", "--host", "0.0.0.0", "--port", "8000"]
