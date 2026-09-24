@echo off
setlocal enabledelayedexpansion
title ILCMS - Malastjornun
cd /d "%~dp0"

:: Check if running in silent mode (e.g. spawned by ILCMS-Silent.vbs)
set "IS_SILENT=0"
if /i "%~1"=="--silent" set "IS_SILENT=1"

:: Locate Node.js executable
set "NODE_CMD="
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "NODE_CMD=node"
) else if exist "%ProgramFiles%\nodejs\node.exe" (
    set "NODE_CMD=%ProgramFiles%\nodejs\node.exe"
) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "NODE_CMD=%ProgramFiles(x86)%\nodejs\node.exe"
) else if exist "%LOCALAPPDATA%\Programs\node\node.exe" (
    set "NODE_CMD=%LOCALAPPDATA%\Programs\node\node.exe"
) else if exist "%APPDATA%\npm\node.cmd" (
    set "NODE_CMD=%APPDATA%\npm\node.cmd"
) else (
    echo [ERROR] Node.js was not found in your system PATH or standard folders.
    echo Node.js 18+ LTS is required to run the local ILCMS server.
    echo.
    echo Opening official Node.js download page...
    start https://nodejs.org/en/download/
    if "!IS_SILENT!"=="1" (
        mshta "javascript:alert('ILCMS requires Node.js 18+ LTS to run locally.\n\nOpening the official Node.js download page. Please complete installation and restart ILCMS.');close()"
    ) else (
        pause
    )
    exit /b 1
)

:: Determine application directory
set "APP_DIR=%LOCALAPPDATA%\ILCMS\app"
set "UNPACK_NEEDED=0"

if not exist "!APP_DIR!\server.js" (
    set "UNPACK_NEEDED=1"
) else if exist "%~dp0version.txt" (
    if not exist "!APP_DIR!\.installed-version" (
        set "UNPACK_NEEDED=1"
    ) else (
        fc /b "%~dp0version.txt" "!APP_DIR!\.installed-version" >nul 2>&1
        if !ERRORLEVEL! neq 0 set "UNPACK_NEEDED=1"
    )
)

if "!UNPACK_NEEDED!"=="1" (
    echo [ILCMS] Updating application files to latest version...
    taskkill /F /IM node.exe /FI "WINDOWTITLE eq ILCMS*" >nul 2>&1
    timeout /t 1 /nobreak >nul
    
    if not exist "%LOCALAPPDATA%\ILCMS" mkdir "%LOCALAPPDATA%\ILCMS" >nul 2>&1
    if exist "!APP_DIR!" (
        rmdir /s /q "!APP_DIR!" >nul 2>&1
    )
    mkdir "!APP_DIR!" >nul 2>&1
    
    where tar >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        tar -xf "%~dp0ilcms-app.zip" -C "!APP_DIR!"
    ) else (
        powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%~dp0ilcms-app.zip' -DestinationPath '!APP_DIR!' -Force"
    )
    
    if exist "%~dp0version.txt" (
        copy /y "%~dp0version.txt" "!APP_DIR!\.installed-version" >nul 2>&1
    )
)

if not exist "!APP_DIR!\server.js" (
    echo [ERROR] Could not find or unpack application server in:
    echo   !APP_DIR!
    if "!IS_SILENT!"=="1" (
        mshta "javascript:alert('ILCMS Error: Failed to unpack application assets into:\n!APP_DIR!\n\nPlease check available disk space and folder permissions.');close()"
    ) else (
        pause
    )
    exit /b 1
)

:: Check if server is already running on port 3000
curl -s -m 1 http://127.0.0.1:3000 >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Starting ILCMS local server on port 3000...
    cd /d "!APP_DIR!"
    start "ILCMS Server" /min cmd /c "set NODE_ENV=production&& set PORT=3000&& set HOST=127.0.0.1&& set HOSTNAME=127.0.0.1&& set AIRGAP_MODE=true&& set AIRGAP_AI_ONLY=true&& "!NODE_CMD!" server.js"
    timeout /t 3 /nobreak >nul
)

echo Launching browser to http://127.0.0.1:3000 ...
start "" "http://127.0.0.1:3000"
exit /b 0
