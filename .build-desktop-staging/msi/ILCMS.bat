@echo off
setlocal
cd /d "%~dp0"
title ILCMS - Rafran Logmannsstofa
echo =====================================================================
echo    ILCMS - Rafran Logmannsstofa (100%% Air-Gapped Legal Workspace)
echo =====================================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js was not found in your system PATH.
    echo Node.js 18+ LTS is required to run the local ILCMS server.
    echo.
    echo Press any key to open the official Node.js download page...
    pause >nul
    start https://nodejs.org/en/download/
    exit /b 1
)

if not exist "app\server.js" (
    echo Unpacking application assets on first launch...
    powershell -NoProfile -Command "Expand-Archive -Path 'ilcms-app.zip' -DestinationPath 'app' -Force"
)

echo Checking server state...
curl -s -m 1 http://127.0.0.1:3000 >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Starting ILCMS local server on port 3000...
    start /min cmd /c "cd /d "%~dp0app" && set NODE_ENV=production&& set PORT=3000&& set AIRGAP_MODE=true&& node server.js"
    timeout /t 2 /nobreak >nul
)

echo Launching browser to http://127.0.0.1:3000 ...
start "" "http://127.0.0.1:3000"
exit /b 0
