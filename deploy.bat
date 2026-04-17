@echo off
chcp 65001 >nul
title Token Vault Deployment
cls

echo ================================================
echo    DISSIDENT TOKEN VAULT - AUTO DEPLOYMENT
echo ================================================
echo.

REM Configuration
set "PROJECT_ROOT=E:\Projects God Tier\Dissident-Tokens-Vault"
set "RAILWAY_URL=https://dissident-tokens-vault-production.up.railway.app"
set "CUSTOM_DOMAIN=https://dissidenttokens.mastertibbles.co.uk"

cd /d "%PROJECT_ROOT%"

echo [1/5] Checking repository status...
git status --porcelain >nul 2>&1
if %errorlevel% == 0 (
    echo    No uncommitted changes found
) else (
    echo    Uncommitted changes detected
    set /p CONTINUE="Continue anyway? [y/N]: "
    if /i not "!CONTINUE!"=="y" exit /b 1
)

echo.
echo [2/5] Committing changes...
git add -A
git commit -m "Auto-deploy: %date% %time%" >nul 2>&1
if %errorlevel% == 0 (
    echo    Changes committed
) else (
    echo    No changes to commit
)

echo.
echo [3/5] Pushing to GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo    ERROR: Push failed
    pause
    exit /b 1
)
echo    Pushed successfully

echo.
echo [4/5] Waiting for Railway deployment...
echo    This may take 2-3 minutes...
echo.

echo    Waiting for Railway to build and deploy...
timeout /t 30 /nobreak >nul

set /a ATTEMPTS=0
set DEPLOYED=0

:CHECK_LOOP
set /a ATTEMPTS+=1
curl -s -o nul -w "%%{http_code}" %RAILWAY_URL% > temp_status.txt 2>nul
set /p STATUS=<temp_status.txt
del temp_status.txt 2>nul

if "%STATUS%"=="200" (
    set DEPLOYED=1
    goto DEPLOYED
)

if %ATTEMPTS% geq 18 (
    echo    ERROR: Deployment timed out
    echo    Check Railway dashboard: https://railway.app/project/resplendent-fulfillment
    pause
    exit /b 1
)

echo    Attempt %ATTEMPTS%: Status %STATUS% - still deploying...
timeout /t 10 /nobreak >nul
goto CHECK_LOOP

:DEPLOYED
echo.
echo [5/5] Deployment complete!
echo.
echo ================================================
echo    DEPLOYMENT SUCCESSFUL!
echo ================================================
echo.
echo URLs:
echo   Railway: %RAILWAY_URL%
echo   Custom:  %CUSTOM_DOMAIN%
echo.
echo Dashboard: https://railway.app/project/resplendent-fulfillment
echo.
pause
