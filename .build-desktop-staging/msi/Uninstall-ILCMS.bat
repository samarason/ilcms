@echo off
echo Stopping any running ILCMS instances...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq ILCMS*" >nul 2>&1
echo Done. Please use Windows Settings or Control Panel to complete uninstallation.
