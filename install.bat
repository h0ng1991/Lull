@echo off
rem Lull one-click installer (Windows). Double-click me.
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js not found. Lull needs Node ^(get it at https://nodejs.org^).
  echo   Install Node, then double-click this file again.
  echo.
  pause
  exit /b 1
)
node "%~dp0install.js"
pause
