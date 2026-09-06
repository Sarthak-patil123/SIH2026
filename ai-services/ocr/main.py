# Python OCR Microservice (FastAPI)
from fastapi import FastAPI, UploadFile, File

app = FastAPI(title="OCR Extraction Service")

@app.get("/health")
def health():
    return {"status": "ok", "service": "ocr"}

@app.post("/extract")
async def extract_text(file: UploadFile = File(...), doc_type: str = "passport"):
    return {"status": "success", "doc_type": doc_type, "fields": {}, "raw_text": ""}
