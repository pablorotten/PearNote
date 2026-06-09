# 🔧 Troubleshooting Guide - Phone-to-Phone P2P

Common issues and solutions for the P2P messaging version.

---

## 🔴 Connection Issues

### "Waiting for peer..." Never Connects

**Symptoms:** Both phones stuck on "Waiting for peer..." indefinitely.

**Possible Causes:**
1. Room code mismatch
2. Network issues
3. NAT traversal failure
4. Firewall blocking

**Solutions:**

#### ✅ Verify Room Code
```
Phone 1 shows: A1B2C3D4E5F6
Phone 2 enters: A1B2C3D4E5F6  ← Must match exactly
```
- Room codes are case-insensitive
- No spaces or special characters
- Exactly 12 characters

#### ✅ Check Network Connection
```bash
# Both phones must have internet access
- Wi-Fi: Preferred for faster discovery
- Mobile data: Works but may be slower
- VPN: May interfere with P2P connections
```

#### ✅ Wait Longer
NAT traversal can take time:
- Typical: 5-10 seconds
- Slow networks: 20-30 seconds
- **Wait at least 30 seconds before giving up**

#### ✅ Try Different Network
```
If stuck on Wi-Fi:
1. Phone 1: Stay on Wi-Fi
2. Phone 2: Switch to mobile data
   (This forces different NAT, may help discovery)

Or both use same Wi-Fi network for faster local discovery.
```

#### ✅ Check Firewall/Security
```
Corporate/School networks may block P2P:
- Use mobile data instead
- Check router settings (UPnP should be enabled)
- Temporarily disable VPN
```

---

## 🔴 App Crashes

### Crash on Startup

**Error:** App crashes immediately after launch

**Solutions:**

#### ✅ Rebuild Bundle
```bash
npm run build-bundle
# or
npx bare-pack --host android -o app/app.bundle.mjs backend/backend-p2p.mjs
```

#### ✅ Clear Metro Cache
```bash
npm start -- --reset-cache
```

#### ✅ Clean Android Build
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Crash When Tapping "Create Room" or "Join Room"

**Error:** App crashes when starting worklet

**Common errors in logcat:**
- `ADDON_NOT_FOUND: Cannot find addon` - Wrong platform addon references (e.g., `.dll` instead of `.so`)
- `dlopen failed: library "udx-native-1.19.2..."` - Native addon can't be loaded
- `ModuleError: MODULE_NOT_FOUND: Cannot find module 'hyperswarm'` - Modules deferred incorrectly
- `SyntaxError: Unexpected token '', "��u�w"...` - Native binaries embedded in JS bundle

**Cause:** Bundle was built without `--host android` flag, so addon references use wrong platform

**Solutions:**

#### ✅ Use Correct Build Command for Android
**Bundle all JavaScript with Android-compatible native addon references:**
```bash
npm run build-bundle
# This runs:
# npx bare-pack --host android -o app/app.bundle.mjs backend/backend-p2p.mjs
```

**Why this works:**
- ✅ **Bundles all JS:** Hyperswarm, bare-rpc, b4a, graceful-goodbye all included
- ✅ **--host android:** Generates `.so` file references for Android (not `.dll`)
- ✅ **Correct addons:** `linked:libudx-native.1.19.2.so` instead of `linked:udx-native-1.19.2.dll`
- ❌ **Without --host android:** Uses wrong platform extensions, dlopen fails

**Check your bundle:**
- ✅ **Correct size:** ~950 KB (all JS bundled, Android addon references)
- ✅ **Correct refs:** `grep 'linked:lib.*\.so' app/app.bundle.mjs` should show `.so` files

#### ✅ Verify Bundle Exists
```bash
ls app/app.bundle.mjs
# Should show the file
```

#### ✅ Rebuild with Correct Flags
```bash
npx bare-pack --host android -o app/app.bundle.mjs backend/backend-p2p.mjs
```

#### ✅ Check Logs
```bash
# Android
adb logcat | grep -E "(Bare|ERROR)"

# iOS
(use Xcode console)
```

---

## 🔴 Messaging Issues

### Messages Not Sending

**Symptoms:** Type message, tap send, nothing happens

**Solutions:**

#### ✅ Verify Connection Status
```
Top of screen should show:
● Connected  ← Green dot

Not:
○ Waiting for peer...  ← Gray dot
```

#### ✅ Check RPC Communication
Look for console errors in app logs:
```bash
adb logcat | grep RPC
```

#### ✅ Restart Connection
1. Close app on both phones
2. Reopen and create/join new room
3. Try sending again

### Messages Delayed

**Symptoms:** Messages take several seconds to arrive

**Cause:** Network latency

**Normal Behavior:**
- Local Wi-Fi: < 100ms
- Same ISP: 100-500ms
- Different ISPs: 500-2000ms
- International: 1000-5000ms

**Solutions:**
- Use same Wi-Fi for faster speeds
- Check network quality (run speed test)
- Reduce message frequency

### Duplicate Messages

**Symptoms:** Same message appears multiple times

**Cause:** Connection instability causing retransmission

**Solutions:**
1. Check network stability
2. Reduce background app usage
3. Move closer to Wi-Fi router

---

## 🔴 Build Errors

### "Cannot find module 'hyperswarm'"

**Error during bundle build**

**Solutions:**

#### ✅ Install Dependencies
```bash
npm install
```

#### ✅ Verify Installation
```bash
npm list hyperswarm
# Should show: hyperswarm@4.17.0
```

### "bare-pack: command not found"

**Error when running build-bundle script**

**Solutions:**

#### ✅ Install bare-pack
```bash
npm install -g bare-pack
# or use npx
npx bare-pack --version
```

### Gradle Build Failed (Android)

**Error during Android build**

**Solutions:**

#### ✅ Clean Build
```bash
cd android
./gradlew clean
./gradlew assembleDebug
cd ..
```

#### ✅ Check JDK Version
```bash
java -version
# Should be Java 17 or higher
```

#### ✅ Clear Gradle Cache
```bash
cd android
rm -rf .gradle build
./gradlew clean
cd ..
```

---

## 🔴 UI Issues

### Room Code Not Displayed

**Symptoms:** Create room but no code appears

**Cause:** RPC communication failure

**Solutions:**

#### ✅ Check Backend Logs
```javascript
// In backend/backend-p2p.mjs, add:
console.log('Room code generated:', simpleCode)
```

#### ✅ Verify RPC Commands
Check `rpc-commands.mjs` includes:
```javascript
export const RPC_ROOM_CODE = 4
```

### Status Shows "Connected" But No Messages

**Symptoms:** Green dot shows connected, but messages don't go through

**Cause:** Connection established but data stream broken

**Solutions:**

1. Restart both apps
2. Create new room with different code
3. Check for network changes (Wi-Fi disconnected, etc.)

---

## 🔴 Platform-Specific Issues

### Android Emulator Can't Connect to Physical Device

**Problem:** Emulator and real phone can't discover each other

**Cause:** Emulator network isolation

**Solutions:**

#### ✅ Use Two Physical Devices
Recommended for testing P2P features.

#### ✅ Configure Emulator Networking
```bash
# Advanced: Port forwarding (complex)
adb forward tcp:8080 tcp:8080
```

Better: Use two physical devices or two emulators.

### iOS Permission Errors

**Problem:** Network permission denied

**Solutions:**

#### ✅ Check Info.plist
Ensure network permissions are set:
```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

#### ✅ Reset Permissions
Settings → General → Reset → Reset Location & Privacy

---

## 🔴 Performance Issues

### High Battery Drain

**Cause:** Persistent P2P connections

**Normal:** P2P connections use more battery than HTTP

**Solutions:**
- Close app when not in use
- Implement connection timeout (future enhancement)
- Use Wi-Fi instead of mobile data

### App Becomes Slow After Many Messages

**Cause:** Large message history in memory

**Solutions:**

#### ✅ Limit Message History
In `app/index-p2p.tsx`, limit stored messages:
```typescript
setMessages((prev) => {
  const newMessages = [...prev, newMessage]
  // Keep only last 100 messages
  return newMessages.slice(-100)
})
```

#### ✅ Clear Chat History
Add a "Clear Chat" button (future enhancement)

---

## 🔴 Discovery Issues

### DHT Lookup Times Out

**Symptoms:** Long wait times, eventual timeout

**Cause:** DHT bootstrap nodes unreachable

**Solutions:**

#### ✅ Check Internet Connection
```bash
# Ping test
ping 8.8.8.8
```

#### ✅ Try Different Network
- Switch from Wi-Fi to mobile data
- Try different Wi-Fi network
- Check if ISP blocks P2P

#### ✅ Manual Bootstrap (Advanced)
In `backend/backend-p2p.mjs`:
```javascript
const swarm = new Hyperswarm({
  bootstrap: [
    'bootstrap1.hyperdht.org:49737',
    'bootstrap2.hyperdht.org:49737'
  ]
})
```

---

## 📊 Debug Mode

### Enable Detailed Logging

#### Backend (backend/backend-p2p.mjs)
```javascript
// Add at top
const DEBUG = true
const log = (...args) => DEBUG && console.log('[P2P Backend]', ...args)

// Use throughout:
log('Starting in mode:', mode)
log('Discovery key:', discoveryKey.toString('hex'))
log('Peers connected:', peers.size)
log('Message received:', message)
```

#### View Logs

**Android:**
```bash
# Real-time logs
adb logcat | grep -i "p2p\|bare\|error"

# Save to file
adb logcat > debug.log
```

**iOS:**
- Open Xcode
- Window → Devices and Simulators
- Select device → View Device Logs

---

## 🆘 Still Having Issues?

### Collect Debug Information

1. **App Version:**
   - Check package.json version
   - Note React Native version

2. **Device Info:**
   - OS version (Android/iOS)
   - Device model
   - Network type (Wi-Fi/4G/5G)

3. **Error Logs:**
   ```bash
   adb logcat > error-log.txt
   ```

4. **Steps to Reproduce:**
   - List exact steps that cause the issue
   - Note when it started happening

### Quick Diagnostic Checklist

```
✓ Internet connection working
✓ Dependencies installed (npm install)
✓ Bundle built (npm run build-bundle)
✓ Room code matches exactly
✓ Both phones have app open
✓ Waited at least 30 seconds
✓ No VPN active
✓ Not on restricted network
✓ App has network permissions
```

---

## 🔄 Nuclear Option: Complete Reset

If nothing works, start fresh:

```bash
# 1. Delete node_modules
rm -rf node_modules

# 2. Clear npm cache
npm cache clean --force

# 3. Reinstall
npm install

# 4. Clean Android build
cd android
./gradlew clean
cd ..

# 5. Rebuild bundle
npm run build-bundle

# 6. Rebuild app
npm run android

# 7. Test with fresh install on device
```

---

## 📚 Additional Resources

- [Hyperswarm Documentation](https://github.com/holepunchto/hyperswarm)
- [Bare Runtime Docs](https://github.com/holepunchto/bare)
- [P2P-FLOW.md](P2P-FLOW.md) - Connection flow details
- [ARCHITECTURE-COMPARISON.md](ARCHITECTURE-COMPARISON.md) - Technical details

---

**Most issues resolve with:** Clean build + Fresh install + Wait 30 seconds + Same Wi-Fi network

Good luck! 🍐
