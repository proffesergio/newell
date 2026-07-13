FROM python:3.12-slim

WORKDIR /app

COPY libs/newell_common /app/libs/newell_common
RUN pip install --no-cache-dir -e /app/libs/newell_common

COPY locales /app/locales
COPY services/interior /app/services/interior
RUN pip install --no-cache-dir -e /app/services/interior

EXPOSE 8000
CMD ["uvicorn", "interior.main:app", "--host", "0.0.0.0", "--port", "8000"]
