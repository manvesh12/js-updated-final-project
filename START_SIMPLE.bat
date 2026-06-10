@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Smart DSR Portal - Simple Start

echo.
echo Smart DSR Portal - Simple Start
echo =================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not available in PATH.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not installed or not available in PATH.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist ".env" (
  echo Creating .env from .env.example...
  copy ".env.example" ".env" >nul
)

echo Syncing env files...
copy ".env" "apps\api\.env" >nul
copy ".env" "apps\web\.env.local" >nul

call :ensureDependencies
if errorlevel 1 exit /b 1

echo.
echo Starting Docker services: PostgreSQL, Redis, MinIO...
where docker >nul 2>nul
if errorlevel 1 (
  echo Docker is not installed or not available in PATH.
  echo Open Docker Desktop/install Docker, then run this file again.
  pause
  exit /b 1
)

docker compose up -d postgres redis minio
if errorlevel 1 (
  echo.
  echo Docker services did not start.
  echo Open Docker Desktop, wait until it is running, then run this file again.
  pause
  exit /b 1
)

echo.
echo Preparing database...
call npm run prisma:generate
if errorlevel 1 (
  echo Prisma generate failed. Running dependency repair once...
  call :repairDependencies
  if errorlevel 1 exit /b 1
  call npm run prisma:generate
  if errorlevel 1 (
    echo Prisma generate still failed.
    pause
    exit /b 1
  )
)

call npm run prisma:migrate
if errorlevel 1 (
  echo Database migration failed. Check Docker Desktop and DATABASE_URL in .env.
  pause
  exit /b 1
)

call npm run seed
if errorlevel 1 (
  echo Database seed failed.
  pause
  exit /b 1
)

echo.
echo Starting backend API on http://localhost:8080 ...
start "DSR API" cmd /k "cd /d ""%~dp0"" && npm run dev:api"

echo Starting worker...
start "DSR Worker" cmd /k "cd /d ""%~dp0"" && npm run dev:worker"

echo Starting frontend on http://localhost:3000 ...
start "DSR Web" cmd /k "cd /d ""%~dp0"" && npm run dev:web"

echo.
echo Waiting a few seconds, then opening the portal...
timeout /t 8 /nobreak >nul
start http://localhost:3000/legacy/login.html

echo.
echo Done. Keep the opened API, Worker, and Web windows running.
echo.
echo Demo login:
echo admin@demo.com / password123
echo iit@demo.com / password123
echo sdlc@demo.com / password123
echo.
pause
exit /b 0

:ensureDependencies
if exist "node_modules\.bin\next.cmd" if exist "node_modules\.bin\tsx.cmd" if exist "node_modules\.bin\prisma.cmd" (
  echo Dependencies look ready.
  exit /b 0
)

echo Installing dependencies...
call npm install --no-audit --no-fund --legacy-peer-deps
if not errorlevel 1 exit /b 0

echo.
echo Normal install failed. Trying clean dependency repair...
call :repairDependencies
exit /b %errorlevel%

:repairDependencies
echo Closing project Node processes and repairing node_modules...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root=(Resolve-Path '.').Path; " ^
  "$procs=Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like ('*' + $root + '*') }; " ^
  "$procs | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {} }; " ^
  "$target=Join-Path $root 'node_modules'; " ^
  "if (Test-Path $target) { $resolved=(Resolve-Path $target).Path; if ($resolved.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)) { Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction Stop } }; " ^
  "$lock=Join-Path $root 'package-lock.json'; if (Test-Path $lock) { Remove-Item -LiteralPath $lock -Force }"

if errorlevel 1 (
  echo.
  echo Could not clean node_modules. Close API/Web/Prisma/VS Code terminals and run this file again.
  pause
  exit /b 1
)

call npm cache verify
call npm install --no-audit --no-fund --legacy-peer-deps
if errorlevel 1 (
  echo.
  echo Clean install failed. Check internet connection, then run this file again.
  pause
  exit /b 1
)

exit /b 0
