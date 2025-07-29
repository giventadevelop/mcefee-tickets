# PowerShell script to copy files to malayalees-us-site project

$sourceDir = Get-Location
$targetDir = "C:\Users\gain\git\malayalees-us-site"

# Files that can be copied directly (no UI components)
$backendFiles = @(
  "src\app\api\event\success\process\route.ts",
  "src\app\event\success\ApiServerActions.ts",
  "src\pages\api\proxy\events\[id]\transactions\[transactionId]\send-ticket-email.ts",
  "src\pages\api\proxy\events\[id]\transactions\qrcode.ts",
  "src\app\admin\events\[id]\tickets\list\TicketTableClient.tsx",
  "src\app\admin\promotion-emails\serverActions.ts",
  "src\lib\env.ts",
  "src\types\index.ts",
  "public\images\buy_tickets_sep_15_parsippany.jpeg"
)

# Files that need header/footer updates
$frontendFiles = @(
  "src\app\events\[id]\tickets\page.tsx",
  "src\app\event\success\page.tsx",
  "src\app\event\success\SuccessClient.tsx",
  "src\app\event\success\LoadingTicket.tsx"
)

Write-Host "🚀 Starting file copy to malayalees-us-site..." -ForegroundColor Green

# Copy backend files (no changes needed)
Write-Host "`n📁 Copying backend files..." -ForegroundColor Yellow
foreach ($file in $backendFiles) {
  $sourcePath = Join-Path $sourceDir $file
  $targetPath = Join-Path $targetDir $file

  if (Test-Path $sourcePath) {
    $targetDirPath = Split-Path $targetPath -Parent
    if (!(Test-Path $targetDirPath)) {
      New-Item -ItemType Directory -Path $targetDirPath -Force | Out-Null
    }

    Copy-Item $sourcePath $targetPath -Force
    Write-Host "✅ Copied: $file" -ForegroundColor Green
  }
  else {
    Write-Host "⚠️  File not found: $file" -ForegroundColor Yellow
  }
}

# Copy frontend files (need manual header/footer updates)
Write-Host "`n📁 Copying frontend files (need manual updates)..." -ForegroundColor Yellow
foreach ($file in $frontendFiles) {
  $sourcePath = Join-Path $sourceDir $file
  $targetPath = Join-Path $targetDir $file

  if (Test-Path $sourcePath) {
    $targetDirPath = Split-Path $targetPath -Parent
    if (!(Test-Path $targetDirPath)) {
      New-Item -ItemType Directory -Path $targetDirPath -Force | Out-Null
    }

    Copy-Item $sourcePath $targetPath -Force
    Write-Host "✅ Copied: $file" -ForegroundColor Green
  }
  else {
    Write-Host "⚠️  File not found: $file" -ForegroundColor Yellow
  }
}

Write-Host "`n🎉 File copy completed!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update header/footer component imports in frontend files" -ForegroundColor White
Write-Host "2. Test the functionality in the target project" -ForegroundColor White
Write-Host "3. Update any project-specific configurations" -ForegroundColor White