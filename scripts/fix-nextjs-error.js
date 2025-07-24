#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Next.js build cache issues...\n');

try {
  // Check if .next directory exists
  const nextDir = path.join(process.cwd(), '.next');
  if (fs.existsSync(nextDir)) {
    console.log('🗑️  Removing .next directory...');
    execSync('rmdir /s /q .next', { stdio: 'inherit' });
    console.log('✅ .next directory removed');
  }

  // Check if node_modules/.cache exists
  const cacheDir = path.join(process.cwd(), 'node_modules', '.cache');
  if (fs.existsSync(cacheDir)) {
    console.log('🗑️  Removing node_modules/.cache...');
    execSync('rmdir /s /q "node_modules\\.cache"', { stdio: 'inherit' });
    console.log('✅ Cache directory removed');
  }

  console.log('\n🧹 Cleaning npm cache...');
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ npm cache cleaned');

  console.log('\n📦 Reinstalling dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies reinstalled');

  console.log('\n🚀 Starting development server...');
  console.log('💡 If the error persists, try:');
  console.log('   1. Close all terminal windows');
  console.log('   2. Restart your code editor');
  console.log('   3. Run: npm run dev');

  execSync('npm run dev', { stdio: 'inherit' });

} catch (error) {
  console.error('❌ Error during fix:', error.message);
  console.log('\n🔧 Manual steps to fix:');
  console.log('1. Stop the development server (Ctrl+C)');
  console.log('2. Delete the .next folder: rmdir /s /q .next');
  console.log('3. Delete node_modules/.cache: rmdir /s /q "node_modules\\.cache"');
  console.log('4. Run: npm install');
  console.log('5. Run: npm run dev');
}