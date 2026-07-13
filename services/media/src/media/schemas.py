from pydantic import BaseModel


class UploadOut(BaseModel):
    media_id: str
    url: str
    content_type: str
