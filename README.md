# Fake Identity Document Screening System (SIH Project)

A multi-layered AI + Blockchain fraud detection system for identity document screening.

## Architecture

- **Frontend**: Next.js 14 (Officer & Admin portals)
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **AI/ML Services**: Python (FastAPI, OpenCV, PyTorch, Tesseract) for OCR, Tampering Detection, and Face Liveness Verification
- **Blockchain**: Hyperledger Fabric for immutable audit trails and SHA-256 document/event anchoring
- **Database**: PostgreSQL (Operational and detailed audit logs)

## Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. AI Services
```bash
cd ai-services
python -m venv venv
# On Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn ocr.main:app --reload --port 8000
```
