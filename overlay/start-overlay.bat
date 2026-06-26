@echo off
cd /d "C:\Users\ph199\Desktop\development\lull\overlay"
echo Starting Lull overlay (a small card should appear at the bottom-right corner)...
powershell -NoProfile -ExecutionPolicy Bypass -File "overlay.ps1"
echo.
echo (Overlay closed. You can close this window.)
pause
