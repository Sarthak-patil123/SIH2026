"""Test the combined Passport + Live Photo verification endpoint directly."""
import sys
from pathlib import Path

# Add ai-services to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent / "ai-services"))

import asyncio
from io import BytesIO
from fastapi import UploadFile
from router.biometric_router import verify_passport_with_live_photo

async def main():
    passport_path = Path("testing/test_images/passport/sample_01_indian_biopage_2021.jpg")
    live_path = Path("testing/test_images/passport/sample_01_indian_biopage_2021.jpg") # self-match test

    if not passport_path.exists():
        print(f"File not found: {passport_path}")
        return

    with open(passport_path, "rb") as f:
        pass_bytes = f.read()

    with open(live_path, "rb") as f:
        live_bytes = f.read()

    pass_upload = UploadFile(filename="passport.jpg", file=BytesIO(pass_bytes))
    live_upload = UploadFile(filename="live.jpg", file=BytesIO(live_bytes))

    print("Running verify_passport_with_live_photo...")
    res = await verify_passport_with_live_photo(passport=pass_upload, live_photo=live_upload)

    print("\n--- Result Summary ---")
    print(f"Status: {res.get('status')}")
    print(f"Document Type: {res.get('document_type')}")
    bio = res.get("face_verification", {})
    print(f"Face Match: {bio.get('is_match')}, Status: {bio.get('status')}, Score: {bio.get('match_score')}")
    print(f"Doc Face Detected: {bio.get('doc_face_detected')}, Live Face Detected: {bio.get('live_face_detected')}")
    print(f"Passport flat fields: {res.get('flat_fields')}")
    print("\nSUCCESS!")

if __name__ == "__main__":
    asyncio.run(main())
