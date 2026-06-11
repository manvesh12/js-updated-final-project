@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Smart DSR Portal - Fast Simple Start

echo.
echo Smart DSR Portal - Fast Simple Start
echo ====================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not available in PATH.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

cd /d "%~dp0apps\web\public\legacy"

echo Building static portal files...
node build.js
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo.
echo Starting lightweight local portal on http://localhost:8081 ...
echo No Docker, no Next dev server, no worker.
start "DSR Simple Portal" cmd /k "cd /d ""%~dp0apps\web\public\legacy"" && set DSR_NO_WATCH=1&& node server.js"

echo.
echo Opening the portal...
timeout /t 2 /nobreak >nul
start http://localhost:8081/home.html

echo.
echo Done. Keep the opened Simple Portal window running.
echo.
echo Demo login:
echo admin@demo.com / password123
echo iit@demo.com / password123
echo sdlc@demo.com / password123
echo.
pause
exit /b 0
