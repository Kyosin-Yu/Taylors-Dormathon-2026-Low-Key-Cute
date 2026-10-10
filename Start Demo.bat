@echo off
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" App.py
) else (
    python App.py
)
if errorlevel 1 (
    echo.
    echo Demo could not start. Read the error above.
    pause
)
