"""API request metadata models.
Note: Images are received as multipart UploadFile, not in the JSON body.
This model validates form-field metadata sent alongside uploads.
"""
from typing import Literal
from pydantic import BaseModel


class DocumentMeta(BaseModel):
    doc_type: Literal["passport", "national_id", "driving_license", "dob_proof"] | None = None
