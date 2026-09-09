# Run AI Services with its existing virtual environment
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\ai-services"
& ".\venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
