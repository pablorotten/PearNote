# 🚀 Quick Setup Guide - Phone-to-Phone Version

This guide will help you switch from the password manager version to the phone-to-phone messaging version.

## Step 1: Install Dependencies

```bash
npm install
```

This will install the new dependencies:
- `hyperswarm` - P2P networking
- `crypto-random-string` - Room code generation

## Step 2: Build the P2P Backend Bundle

You need to bundle the new backend for the Bare runtime:

```bash
npx bare-pack --defer hyperswarm -o app/app.bundle.mjs backend/backend-p2p.mjs
```

**What this does:** Packages the Hyperswarm backend into a format that can run in the Bare worklet.

## Step 3: Update the App Entry Point

Replace the main app file with the P2P version:

### Option A: Rename files (recommended)
```bash
# Backup original
cp app/index.tsx app/index-original.tsx

# Use P2P version
cp app/index-p2p.tsx app/index.tsx
```

### Option B: Edit app routing
If using Expo Router, update your routing to point to `index-p2p.tsx`.

## Step 4: Update Backend Reference

Make sure your bundle is using the P2P backend:

In `app/index-p2p.tsx`, verify this line points to the correct bundle:
```typescript
import bundle from './app.bundle.mjs'
```

## Step 5: Run the App

```bash
# For Android
npm run android

# For iOS
npm run ios
```

## Testing Phone-to-Phone

### Test with Two Devices:

1. **Device 1 (Creator):**
   - Open app
   - Tap "Create Room"
   - Copy the room code (e.g., `A1B2C3D4E5F6`)

2. **Device 2 (Joiner):**
   - Open app
   - Enter the room code
   - Tap "Join Room"

3. **Both Devices:**
   - Wait for "Connected" status
   - Start sending messages!

### Test with Emulator + Device:

You can also test with:
- Android Emulator + Physical device
- Two emulators (may require network configuration)

## File Structure After Setup

```
MovieKollections/
├── app/
│   ├── index.tsx              ← P2P frontend (active)
│   ├── index-p2p.tsx          ← P2P frontend (source)
│   ├── index-original.tsx     ← Original (backup)
│   └── app.bundle.mjs         ← P2P backend bundle
├── backend/
│   ├── backend-p2p.mjs        ← P2P backend (source)
│   └── backend.mjs            ← Original backend
└── rpc-commands.mjs           ← Updated with new commands
```

## Troubleshooting

### Bundle Build Fails

**Error:** `Cannot find module 'hyperswarm'`

**Solution:** Make sure you ran `npm install` first.

### App Crashes on Start

**Error:** Bundle not found

**Solution:** 
```bash
# Rebuild the bundle
npx bare-pack --defer hyperswarm -o app/app.bundle.mjs backend/backend-p2p.mjs

# Clear metro cache
npm start -- --reset-cache
```

### "Waiting for peer..." Forever

**Possible causes:**
1. Both phones need internet connection (Wi-Fi or mobile data)
2. NAT traversal can take 10-20 seconds
3. Some corporate networks block P2P connections
4. Room code was entered incorrectly

**Solutions:**
- Use same Wi-Fi network for faster discovery
- Wait up to 30 seconds
- Try different network (mobile data vs Wi-Fi)
- Double-check room code (case-insensitive)

### Build Errors (Android)

**Error:** Gradle build failed

**Solution:**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

## Reverting to Original Password Manager

To go back to the original version:

```bash
# Restore original frontend
cp app/index-original.tsx app/index.tsx

# Rebuild original bundle
npx bare-pack --defer autopass --defer corestore -o app/app.bundle.mjs backend/backend.mjs

# Run
npm run android
```

## Advanced Configuration

### Custom Room Code Length

Edit `backend/backend-p2p.mjs`:

```javascript
// Change this line (line ~30)
const simpleCode = b4a.toString(discoveryKey, 'hex').substring(0, 12) // 12 chars

// To shorter (6 chars):
const simpleCode = b4a.toString(discoveryKey, 'hex').substring(0, 6)

// Or longer (24 chars):
const simpleCode = b4a.toString(discoveryKey, 'hex').substring(0, 24)
```

### Enable Debug Logging

Add console logs in `backend/backend-p2p.mjs`:

```javascript
// Add after each swarm event
console.log('Current peers:', peers.size)
console.log('Message sent:', message)
```

View logs:
```bash
# Android
adb logcat | grep -i "bare"

# iOS
(use Xcode console)
```

## Next Steps

1. ✅ Test basic messaging
2. ✅ Try on different networks
3. 📱 Share with friends
4. 🔨 Customize the UI
5. 🚀 Add new features (file sharing, encryption, etc.)

## Need Help?

- Check the main [README-P2P.md](README-P2P.md) for architecture details
- Review [backend/backend-p2p.mjs](backend/backend-p2p.mjs) for backend logic
- Review [app/index-p2p.tsx](app/index-p2p.tsx) for frontend logic

---

**Happy P2P Messaging! 🍐**
