from fastapi import APIRouter, Depends, File, UploadFile

from media.deps import get_media_service
from media.schemas import UploadOut
from media.service import MediaService

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/upload", response_model=UploadOut)
async def upload(
    file: UploadFile = File(...),
    service: MediaService = Depends(get_media_service),
) -> UploadOut:
    data = await file.read()
    result = await service.upload(file.filename or "", file.content_type or "", data)
    return UploadOut(**result)
