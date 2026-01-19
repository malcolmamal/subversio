@echo off
setlocal

echo Starting backend...
start "SubVersio Backend" cmd /k "npm run dev:backend"
echo Backend started.

echo Starting frontend...
start "SubVersio Frontend" cmd /k "npm run dev:frontend"
echo Frontend started.

echo Both services launched.
