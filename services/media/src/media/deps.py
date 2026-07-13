from functools import lru_cache

from fastapi import Depends

from media.service import MediaService
from media.storage import MinioStorage, ObjectStorage
from newell_common.config import get_settings


@lru_cache
def get_storage() -> ObjectStorage:
    return MinioStorage(get_settings())


def get_media_service(storage: ObjectStorage = Depends(get_storage)) -> MediaService:
    return MediaService(storage)
