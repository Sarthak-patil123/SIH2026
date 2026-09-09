"""API request metadata models.
Note: Images are received as multipart UploadFile, not in the JSON body.
This model validates form-field metadata sent alongside uploads.
"""
from typing import Literal
from pydantic import BaseModel


class DocumentMeta(BaseModel):
    doc_type: (
        Literal[
            "passport",
            "visa",
            "national_id",
            "driving_licence",   # British spelling (canonical)
            "driving_license",   # US spelling alias
            "dob_proof",
        ]
        | None
    ) = None
