@echo off
setlocal
cd /d "%~dp0..\.."
echo Stopping Docker services...
docker compose down
echo Close the DSR API, DSR Worker, and DSR Web command windows if they are still open.
pause

