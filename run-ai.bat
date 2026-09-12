@echo off
echo Starting AI Services on http://localhost:8000 ...
cd "%~dp0ai-services"
call ".\venv\Scripts\activate.bat"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
