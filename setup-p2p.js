#!/usr/bin/env node

/**
 * Quick Setup Script for Phone-to-Phone P2P Version
 * 
 * This script automates the setup to switch from the desktop-paired
 * password manager to the phone-to-phone messaging app.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🍐 P2PKollections - Phone-to-Phone Setup\n')

// Step 1: Backup originals
console.log('📦 Step 1: Backing up original files...')
if (fs.existsSync('app/index.tsx') && !fs.existsSync('app/index-original.tsx')) {
  fs.copyFileSync('app/index.tsx', 'app/index-original.tsx')
  console.log('  ✅ Backed up app/index.tsx → app/index-original.tsx')
}

if (fs.existsSync('backend/backend.mjs') && !fs.existsSync('backend/backend-original.mjs')) {
  fs.copyFileSync('backend/backend.mjs', 'backend/backend-original.mjs')
  console.log('  ✅ Backed up backend/backend.mjs → backend/backend-original.mjs')
}

// Step 2: Copy P2P versions
console.log('\n📝 Step 2: Activating P2P version...')
fs.copyFileSync('app/index-p2p.tsx', 'app/index.tsx')
console.log('  ✅ Copied app/index-p2p.tsx → app/index.tsx')

fs.copyFileSync('backend/backend-p2p.mjs', 'backend/backend.mjs')
console.log('  ✅ Copied backend/backend-p2p.mjs → backend/backend.mjs')

// Step 3: Build bundle
console.log('\n🔨 Step 3: Building Bare bundle...')
try {
  execSync(
    'npx bare-pack --linked -o app/app.bundle.mjs backend/backend.mjs',
    { stdio: 'inherit' }
  )
  console.log('  ✅ Bundle created successfully!')
} catch (error) {
  console.error('  ❌ Bundle build failed. You may need to build manually.')
  console.error('     Run: npx bare-pack --linked -o app/app.bundle.mjs backend/backend.mjs')
  process.exit(1)
}

// Step 4: Done!
console.log('\n✨ Setup Complete!\n')
console.log('📱 Next steps:')
console.log('   1. Run: npm run android (or npm run ios)')
console.log('   2. On Phone 1: Tap "Create Kollection"')
console.log('   3. On Phone 2: Enter the kollection code and tap "Join Kollection"')
console.log('   4. Start messaging!\n')
console.log('📚 Documentation:')
console.log('   - README-P2P.md - Overview and features')
console.log('   - SETUP-P2P.md - Detailed setup guide')
console.log('   - P2P-FLOW.md - Connection flow diagrams')
console.log('   - ARCHITECTURE-COMPARISON.md - Old vs new comparison\n')
console.log('🔄 To revert to original:')
console.log('   cp app/index-original.tsx app/index.tsx')
console.log('   cp backend/backend-original.mjs backend/backend.mjs\n')
