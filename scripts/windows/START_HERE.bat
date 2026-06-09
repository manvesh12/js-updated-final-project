@echo off
setlocal
cd /d "%~dp0..\.."

echo.
echo Smart DSR Portal - One Click Start
echo ==================================
echo.

if not exist .env (
  echo Creating .env from .env.example...
  copy .env.example .env >nul
)

copy .env apps\api\.env >nul
copy .env apps\web\.env.local >nul

if not exist node_modules\.bin\next.cmd (
  echo Installing dependencies. First run can take time...
  call npm install --no-audit --no-fund --legacy-peer-deps
  if errorlevel 1 (
    echo.
    echo Install failed. Try running install-fast.bat manually.
    pause
    exit /b 1
  )
)

if not exist node_modules\effect\dist\cjs\Arbitrary.js (
  echo Repairing incomplete npm install...
  call npm install --no-audit --no-fund --legacy-peer-deps
  if errorlevel 1 (
    echo.
    echo Dependency repair failed. Run REPAIR_INSTALL.bat, then START_HERE.bat again.
    pause
    exit /b 1
  )
)

echo Starting database, Redis, and MinIO...
netstat -ano | findstr ":5440" >nul
if not errorlevel 1 (
  echo Existing Postgres/DSR Docker services detected on port 5440. Skipping compose startup.
) else (
  docker compose down --remove-orphans
  docker compose up -d postgres redis minio
  if errorlevel 1 (
    echo.
    echo Docker did not start. Start Docker Desktop, then run START_HERE.bat again.
    pause
    exit /b 1
  )
)

echo Generating Prisma client...
call npm run prisma:generate
if errorlevel 1 (
  echo Prisma generate failed. Run REPAIR_INSTALL.bat, then START_HERE.bat again.
  pause
  exit /b 1
)

echo Migrating database...
call npm run prisma:migrate
if errorlevel 1 (
  echo Database migration failed. Check Docker Desktop and DATABASE_URL in .env.
  pause
  exit /b 1
)

echo Seeding demo users...
call npm run seed
if errorlevel 1 (
  echo Database seed failed. Check Prisma migration output above.
  pause
  exit /b 1
)

echo Starting API...
netstat -ano | findstr ":8080" >nul
if not errorlevel 1 (
  echo API already running on port 8080.
) else (
  start "DSR API" cmd /k "cd /d %~dp0 && npm run dev:api"
)

echo Starting workers...
start "DSR Worker" cmd /k "cd /d %~dp0 && npm run dev:worker"

echo Starting frontend...
netstat -ano | findstr ":3000" >nul
if not errorlevel 1 (
  echo Frontend already running on port 3000.
) else (
  start "DSR Web" cmd /k "cd /d %~dp0 && npm run dev:web"
)

echo.
echo Opening browser...
start http://localhost:3000
echo.
echo Demo login:
echo admin@demo.com / password123
echo iit@demo.com / password123
echo sdlc@demo.com / password123
echo.
pause

