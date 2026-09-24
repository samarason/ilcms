@echo off
setlocal
echo =====================================================================
echo    ILCMS Uninstallation Cleanup
echo =====================================================================
echo.
echo Stopping any active ILCMS server instances...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq ILCMS*" >nul 2>&1
echo Cleaning local user workspace files...
if exist "%LOCALAPPDATA%\ILCMS" (
    rmdir /s /q "%LOCALAPPDATA%\ILCMS" >nul 2>&1
)
echo Done. Please complete uninstallation via Windows Settings or Control Panel.
