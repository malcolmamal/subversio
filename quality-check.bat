@echo off
echo 🔍 Running Quality Pipeline...

echo 🏗️  Building Backend...
call npm run build:backend
if %errorlevel% neq 0 exit /b %errorlevel%

echo 🧪 Testing Backend...
call npm run test:backend
if %errorlevel% neq 0 exit /b %errorlevel%

echo 🏗️  Building Frontend...
call npm run build:frontend
if %errorlevel% neq 0 exit /b %errorlevel%

echo 🧪 Testing Frontend...
call npm run test:frontend
if %errorlevel% neq 0 exit /b %errorlevel%

echo 🧹 Linting Project...
call npm run lint
if %errorlevel% neq 0 exit /b %errorlevel%

echo ✨ Fixing Formatting...
call npm run format
if %errorlevel% neq 0 exit /b %errorlevel%

echo ✅ Quality Pipeline Passed!

