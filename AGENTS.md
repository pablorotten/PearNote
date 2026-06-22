# AGENTS.md — PearNote

## Logcat commands (filtered to app only)

```powershell
# Device A (6ae4c054c2b8)
adb -s 6ae4c054c2b8 logcat -s "ReactNativeJS:D" "to.holepunch.bare.expo:D" "*:S" -d > logs/6ae4c054c2b8.log

# Device B (e017a252)
adb -s e017a252 logcat -s "ReactNativeJS:D" "to.holepunch.bare.expo:D" "*:S" -d > logs/e017a252.log

# Live tail (instead of -d, omit):
adb -s 6ae4c054c2b8 logcat -s "ReactNativeJS:D" "to.holepunch.bare.expo:D" "*:S"
```

If `ReactNativeJS` tag doesn't work, try `Bare:I` or `BareKit:I` instead.

## Clear app data (before each test run)

```powershell
adb -s 6ae4c054c2b8 shell pm clear to.holepunch.bare.expo
adb -s e017a252 shell pm clear to.holepunch.bare.expo
```

If `pm clear` fails, uninstall and reinstall:
```powershell
adb -s 6ae4c054c2b8 uninstall to.holepunch.bare.expo
adb -s e017a252 uninstall to.holepunch.bare.expo
npm run android
```

## Rebuild bundle after backend changes

```powershell
npx bare-pack --host android --linked --out app/app.bundle.mjs backend/backend.mjs
```

Then rebuild APK: `npm run android`

## Test flow

1. **Create note** (Phone A): open app → tap "Create Note" → wait for loading spinner → verify "Note Created!" alert with invite code appears → verify items appear on screen
2. **Join** (Phone B): open app → paste invite code from A → tap "Join Note" → wait for loading → verify both phones show same list
3. **Add item**: type title on A → tap + → verify item appears on both phones within seconds
4. **Remove item**: tap X on an item → verify it disappears on both phones
5. **Leave and re-enter**: tap ← on Phone A → tap the note in "Your Notes" history → should rejoin with same items

## Known issues

- `pass.suspend()` + `goodbye.run()` is needed before process.exit(0) to release Corestore file lock
- `bareKit.terminate()` kills the worklet abruptly → lock never released
- `pair.finished()` has no built-in timeout → 30s wrapper timeout added
- `pass.add(key, value)` requires value to be a **string** (not array), or it crashes with `uint must be positive`
- History items store old invite codes; tapping them now COPIES the code instead of trying to JOIN a dead note. Always use **Create Note** for new sessions.
- Each note session now uses a unique timestamp-based storage path (`PearNote/<sessionId>`) to prevent Corestore state corruption between sessions. Old session dirs accumulate but are harmless.
