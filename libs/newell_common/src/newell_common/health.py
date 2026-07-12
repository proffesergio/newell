def health_payload(service_name: str) -> dict:
    return {"status": "ok", "service": service_name}
