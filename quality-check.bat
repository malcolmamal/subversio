@echo off
echo Running Quality Pipeline...

echo [1/6] Building Backend...
call npm run build:backend:ci
if %errorlevel% neq 0 exit /b %errorlevel%

echo [2/6] Testing Backend...
call npm run test:backend
if %errorlevel% neq 0 exit /b %errorlevel%

echo [3/6] Building Frontend...
call npm run build:frontend
if %errorlevel% neq 0 exit /b %errorlevel%

echo [4/6] Testing Frontend...
call npm run test:frontend
if %errorlevel% neq 0 exit /b %errorlevel%

echo [5/6] Linting Project...
call npm run lint
if %errorlevel% neq 0 exit /b %errorlevel%

echo [6/6] Formatting...
call npm run format
if %errorlevel% neq 0 exit /b %errorlevel%

echo Quality Pipeline Passed!

