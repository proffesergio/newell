# services/profile/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install shared lib first (better layer caching)
COPY libs/newell_common /app/libs/newell_common
RUN pip install --no-cache-dir -e /app/libs/newell_common

COPY services/profile /app/services/profile
RUN pip install --no-cache-dir -e /app/services/profile

# i18n catalogs: newell_common.i18n.translate reads locales/ relative to CWD.
COPY locales /app/locales

EXPOSE 8000
CMD ["uvicorn", "profiles.main:app", "--host", "0.0.0.0", "--port", "8000"]
