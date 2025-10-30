#!/bin/bash

echo "=================================="
echo "🚀 Attendance PWA - Deploy Setup"
echo "=================================="
echo ""

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first:"
    echo "   Download: https://git-scm.com/downloads"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "   Please run this script from the project root directory"
    exit 1
fi

echo "✅ Git is installed"
echo ""

# Ask for GitHub username
read -p "Enter your GitHub username: " GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo "❌ GitHub username is required"
    exit 1
fi

echo ""
echo "📝 Setup Summary:"
echo "   Repository: https://github.com/$GITHUB_USERNAME/attendance-pwa"
echo ""

# Initialize Git if not already initialized
if [ ! -d ".git" ]; then
    echo "🔧 Initializing Git repository..."
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git repository already exists"
fi

# Add all files
echo ""
echo "📦 Adding files to Git..."
git add .

# Create commit
echo ""
echo "💾 Creating commit..."
git commit -m "Initial commit - Ready for Vercel deployment"

# Add remote
echo ""
echo "🔗 Adding GitHub remote..."
git remote remove origin 2>/dev/null  # Remove if exists
git remote add origin "https://github.com/$GITHUB_USERNAME/attendance-pwa.git"

# Rename branch to main
echo ""
echo "🌿 Setting branch to 'main'..."
git branch -M main

echo ""
echo "=================================="
echo "✅ Setup Complete!"
echo "=================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Create GitHub Repository:"
echo "   Go to: https://github.com/new"
echo "   Name: attendance-pwa"
echo "   Visibility: Private (recommended)"
echo "   DON'T initialize with README"
echo ""
echo "2. Push to GitHub:"
echo "   Run: git push -u origin main"
echo ""
echo "   You may need a Personal Access Token instead of password:"
echo "   Create at: https://github.com/settings/tokens"
echo "   Select scope: repo (full control)"
echo ""
echo "3. Deploy on Vercel:"
echo "   Go to: https://vercel.com/new"
echo "   Import from GitHub: attendance-pwa"
echo "   Follow instructions in DEPLOYMENT.md"
echo ""
echo "=================================="
