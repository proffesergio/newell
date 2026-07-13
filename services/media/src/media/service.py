import uuid

from media.storage import ObjectStorage
from newell_common.errors import NewellError


class MediaService:
    def __init__(self, storage: ObjectStorage) -> None:
        self.storage = storage

    async def upload(self, filename: str, content_type: str, data: bytes) -> dict:
        if not content_type or not content_type.startswith("image/"):
            raise NewellError(
                "media.invalid_type",
                f"Unsupported content type: {content_type}",
                status_code=400,
            )

        media_id = uuid.uuid4().hex
        key = f"plants/{media_id}"
        url = self.storage.put(key, data, content_type)

        return {"media_id": media_id, "url": url, "content_type": content_type}
