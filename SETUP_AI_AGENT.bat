@echo off
chcp 65001 >nul
SETLOCAL EnableDelayedExpansion

cls
echo ============================================================
echo   🤖 AUTONOMOUS DEVOPS AI AGENT - Quick Setup
echo ============================================================
echo.
echo This script will configure your AI Agent with your credentials
echo.

:: Check if we're in the right directory
if not exist "vault.html" (
    echo ❌ ERROR: Please run this script from the Dissident-Tokens-Vault folder
    pause
    exit /b 1
)

echo ✅ Found vault.html - we're in the right place!
echo.

:: ============================================
:: Step 1: Ollama API Key
:: ============================================
echo ────────────────────────────────────────────────────────────
echo STEP 1: Ollama Cloud API Key
echo ────────────────────────────────────────────────────────────
echo.
echo Your API key starts with "oc_" (e.g., oc_live_xxxxxxxx)
echo Get it from your Ollama Cloud dashboard
echo.
set /p OLLAMA_KEY="🔑 Enter your OLLAMA_API_KEY: "

if "!OLLAMA_KEY!"=="" (
    echo ❌ ERROR: API Key is required
    pause
    exit /b 1
)

echo ✅ API Key received
echo.

:: ============================================
:: Step 2: Database URL
:: ============================================
echo ────────────────────────────────────────────────────────────
echo STEP 2: Railway PostgreSQL DATABASE_URL
echo ────────────────────────────────────────────────────────────
echo.
echo Get this from Railway Dashboard:
echo 1. Go to your PostgreSQL service
echo 2. Click "Connect" tab
echo 3. Copy DATABASE_URL
echo.
echo It looks like: postgresql://user:pass@host:port/database
echo.
set /p DB_URL="🗄️  Enter your DATABASE_URL: "

if "!DB_URL!"=="" (
    echo ❌ ERROR: Database URL is required
    pause
    exit /b 1
)

echo ✅ Database URL received
echo.

:: ============================================
:: Step 3: Service URLs
:: ============================================
echo ────────────────────────────────────────────────────────────
echo STEP 3: Your Service URLs
echo ────────────────────────────────────────────────────────────
echo.
echo Enter your actual service URLs:
echo.

set /p WEBSITE_URL="🌐 Website URL (e.g., https://dissident.com): "
set /p API_URL="🔌 API Backend URL (e.g., https://api.dissident.com): "
set /p RAILWAY_SERVICE="🚂 Railway Service Name (e.g., dissident-website): "

echo ✅ Service URLs received
echo.

:: ============================================
:: Updating Configuration Files
:: ============================================
echo ────────────────────────────────────────────────────────────
echo 📝 Updating Configuration Files...
echo ────────────────────────────────────────────────────────────
echo.

:: Update ai-health-engine.js with actual URLs
echo 🔄 Updating ai-health-engine.js...
powershell -Command "(Get-Content 'js\ai-health-engine.js') -replace 'https://YOUR-DOMAIN.com', '%WEBSITE_URL%' -replace 'https://api.YOUR-DOMAIN.com', '%API_URL%' -replace 'YOUR-RAILWAY-SERVICE-NAME', '%RAILWAY_SERVICE%' | Set-Content 'js\ai-health-engine.js'"

:: Update Ollama configuration
echo 🔄 Updating Ollama Cloud settings...
powershell -Command "(Get-Content 'js\ollama-cloud-integration.js') -replace 'ollama-cloud.reddgr.com', 'ollama-cloud.reddgr.com' | Set-Content 'js\ollama-cloud-integration.js'"

echo ✅ Configuration files updated
echo.

:: ============================================
:: Create Environment File
:: ============================================
echo ────────────────────────────────────────────────────────────
echo 📝 Creating Environment Configuration...
echo ────────────────────────────────────────────────────────────
echo.

(
echo # Autonomous DevOps AI Agent Configuration
echo # Created: %date% %time%
echo.
echo # Ollama Cloud API Key
echo OLLAMA_API_KEY=%OLLAMA_KEY%
echo.
echo # Railway PostgreSQL
echo DATABASE_URL=%DB_URL%
echo.
echo # Service URLs
echo WEBSITE_URL=%WEBSITE_URL%
echo API_URL=%API_URL%
echo RAILWAY_SERVICE_NAME=%RAILWAY_SERVICE%
echo.
echo # AI Configuration
echo AI_AUTO_HEAL_CONFIDENCE=0.90
echo AI_MAX_FIXES_PER_HOUR=10
echo AI_COOLDOWN_MINUTES=5
echo AI_ROLLBACK_DEPTH=10
echo.
echo # ⚠️  IMPORTANT: Add these to your vault's Shared Variables!
) > .env.ai-agent

echo ✅ Created .env.ai-agent file
echo.

:: ============================================
:: Instructions for Vault
:: ============================================
echo ────────────────────────────────────────────────────────────
echo 📋 NEXT STEPS - Add to Token Vault:
echo ────────────────────────────────────────────────────────────
echo.
echo 1. Open your Token Vault (vault.html)
echo 2. Go to Shared Variables section
echo 3. Add these TWO variables:
echo.
echo    🔑 Key: OLLAMA_API_KEY
echo      Value: %OLLAMA_KEY:~0,20%...... (hidden for security)
echo      Type: Secret
echo.
echo    🔑 Key: DATABASE_URL
echo      Value: %DB_URL:~0,30%...... (hidden for security)
echo      Type: Secret
echo.
echo 4. Click Save
echo.
echo ────────────────────────────────────────────────────────────
echo 🚀 DEPLOY TO RAILWAY:
echo ────────────────────────────────────────────────────────────
echo.
echo Run these commands:
echo.
echo    git add -A
echo    git commit -m "Configure AI Agent with production settings"
echo    git push origin main
echo.
echo Then watch Railway deploy automatically!
echo.
echo ────────────────────────────────────────────────────────────
echo ✅ SETUP COMPLETE!
echo ────────────────────────────────────────────────────────────
echo.
echo Your AI Agent is ready! After deployment:
echo 1. Open vault.html
echo 2. Click 🤖 AI Central Hub
echo 3. Find "🎓 AI Training Ground" panel
echo 4. Test with "Slow Response" scenario
echo.
pause
