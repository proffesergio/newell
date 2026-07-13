import io
from typing import Protocol

from minio import Minio

from newell_common.config import Settings


class ObjectStorage(Protocol):
    def put(self, key: str, data: bytes, content_type: str) -> str:
        """Store an object and return a URL string it can be fetched from."""
        ...


class MinioStorage:
    """Object storage backed by MinIO, auto-creating the target bucket."""

    def __init__(self, settings: Settings) -> None:
        self._bucket = settings.minio_bucket
        self._public_endpoint = settings.minio_public_endpoint
        self._client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=False,
        )
        if not self._client.bucket_exists(self._bucket):
            self._client.make_bucket(self._bucket)

    def put(self, key: str, data: bytes, content_type: str) -> str:
        self._client.put_object(
            self._bucket,
            key,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return f"http://{self._public_endpoint}/{self._bucket}/{key}"


class InMemoryStorage:
    """Test double for ObjectStorage; keeps everything in a dict."""

    def __init__(self) -> None:
        self.items: dict[str, tuple[bytes, str]] = {}

    def put(self, key: str, data: bytes, content_type: str) -> str:
        self.items[key] = (data, content_type)
        return f"http://test-media/{key}"
