@echo off
setlocal enabledelayedexpansion

echo ==================================
echo 🚀 Attendance PWA - Deploy Setup
echo ==================================
echo.

REM Check if Git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git is not installed. Please install Git first:
    echo    Download: https://git-scm.com/downloads
    pause
    exit /b 1
)

echo ✅ Git is installed
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found
    echo    Please run this script from the project root directory
    pause
    exit /b 1
)

REM Ask for GitHub username
set /p GITHUB_USERNAME="Enter your GitHub username: "

if "!GITHUB_USERNAME!"=="" (
    echo ❌ GitHub username is required
    pause
    exit /b 1
)

echo.
echo 📝 Setup Summary:
echo    Repository: https://github.com/!GITHUB_USERNAME!/attendance-pwa
echo.

REM Initialize Git if not already initialized
if not exist ".git" (
    echo 🔧 Initializing Git repository...
    git init
    echo ✅ Git initialized
) else (
    echo ✅ Git repository already exists
)

REM Add all files
echo.
echo 📦 Adding files to Git...
git add .

REM Create commit
echo.
echo 💾 Creating commit...
git commit -m "Initial commit - Ready for Vercel deployment"

REM Add remote
echo.
echo 🔗 Adding GitHub remote...
git remote remove origin 2>nul
git remote add origin "https://github.com/!GITHUB_USERNAME!/attendance-pwa.git"

REM Rename branch to main
echo.
echo 🌿 Setting branch to 'main'...
git branch -M main

echo.
echo ==================================
echo ✅ Setup Complete!
echo ==================================
echo.
echo 📋 Next Steps:
echo.
echo 1. Create GitHub Repository:
echo    Go to: https://github.com/new
echo    Name: attendance-pwa
echo    Visibility: Private (recommended)
echo    DON'T initialize with README
echo.
echo 2. Push to GitHub:
echo    Run: git push -u origin main
echo.
echo    You may need a Personal Access Token instead of password:
echo    Create at: https://github.com/settings/tokens
echo    Select scope: repo (full control)
echo.
echo 3. Deploy on Vercel:
echo    Go to: https://vercel.com/new
echo    Import from GitHub: attendance-pwa
echo    Follow instructions in DEPLOYMENT.md
echo.
echo ==================================
echo.
pause
