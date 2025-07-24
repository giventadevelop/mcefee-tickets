@echo off
echo 🔧 Fixing Next.js build cache issues...
echo.

echo 🗑️  Stopping development server...
taskkill /f /im node.exe >nul 2>&1

echo 🗑️  Removing .next directory...
if exist ".next" (
    rmdir /s /q ".next"
    echo ✅ .next directory removed
) else (
    echo ℹ️  .next directory not found
)

echo 🗑️  Removing node_modules/.cache...
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache"
    echo ✅ Cache directory removed
) else (
    echo ℹ️  Cache directory not found
)

echo 🧹 Cleaning npm cache...
call npm cache clean --force
echo ✅ npm cache cleaned

echo 📦 Reinstalling dependencies...
call npm install
echo ✅ Dependencies reinstalled

echo.
echo 🚀 Starting development server...
echo 💡 If the error persists, try:
echo    1. Close all terminal windows
echo    2. Restart your code editor
echo    3. Run: npm run dev
echo.

call npm run dev