# P2PKollections

## Commands

- 📱phone1: 6ae4c054c2b8
- 📱phone2: e017a252

Install dependencies and build the backend bundle:
```sh
npm install
npx bare-pack --host android --linked --out app/app.bundle.mjs backend/backend.mjs
```

Build and run the debug APK with Metro bundler:
```sh
npm run android
```

Install  the debug APK in specific device
```sh
# Install APK
adb -s e017a252 install -r android/app/build/outputs/apk/debug/app-debug.apk;
# Reverse port for Metro
adb -s e017a252 reverse tcp:8081 tcp:8081; 
# Start the app
adb -s e017a252 shell am start -n com.p2pkollections.app/.MainActivity 

# Single command on e017a252
adb -s e017a252 install -r android/app/build/outputs/apk/debug/app-debug.apk; adb -s e017a252 reverse tcp:8081 tcp:8081; adb -s e017a252 shell am start -n com.p2pkollections.app/.MainActivity

# On 6ae4c054c2b8 device
adb -s 6ae4c054c2b8 install -r android/app/build/outputs/apk/debug/app-debug.apk; adb -s 6ae4c054c2b8 reverse tcp:8081 tcp:8081; adb -s 6ae4c054c2b8 shell am start -n com.p2pkollections.app/.MainActivity 
```

> [!WARNING]
> `npm run android` builds a debug APK. In debug mode, the React Native JavaScript bundle (your UI code in app/index.tsx) is not included in the APK. Instead, the app downloads it live from Metro (a dev server on your computer) over USB and If there's a change on `app/`, Metro will automatically reload the app.
> 
> `Unplug = Metro disappears → app can't fetch the JS bundle → crash`

> [!NOTE]
> If there's a change on `backend/`, you need to run `npx bare-pack --host android --linked --out app/app.bundle.mjs backend/backend.mjs` and then manually reload the app.


**📦 Genereate release apk**: generate, install and launch non-debug metro-independent APK
npx expo run:android --variant release
adb -s e017a252 install -r android/app/build/outputs/apk/release/app-release.apk
adb -s e017a252 shell am start -n com.p2pkollections.app/.MainActivity
```

> [!NOTE]
> This APK will work without Metro (you can unplug the phone)


❌ Uninstall the app:
```sh
adb -s 6ae4c054c2b8 uninstall com.p2pkollections.app
adb -s e017a252 uninstall com.p2pkollections.app

adb -s 6ae4c054c2b8 uninstall com.p2pkollections.app; adb -s e017a252 uninstall com.p2pkollections.app
```

## 🪵 Logs

Clear logs:
```sh
adb -s 6ae4c054c2b8 logcat -c; adb -s e017a252 logcat -c
```

Log specific device only Warning and above:
```sh
adb -s 6ae4c054c2b8 logcat -c
adb -s 6ae4c054c2b8 logcat *:W -d > logs/6ae4c054c2b8.log
adb -s 6ae4c054c2b8 logcat -s "ReactNativeJS:D" "to.holepunch.bare.expo:D" "*:S" -d > logs/6ae4c054c2b8.log

adb -s e017a252 logcat -c
adb -s e017a252 logcat *:W -d > logs/e017a252.log
adb -s e017a252 logcat -s "ReactNativeJS:D" "to.holepunch.bare.expo:D" "*:S" -d > logs/e017a252.log
```

Log specific app messages, for example in th app you have `console.log('DIAG:', msg)`
```sh
adb -s 6ae4c054c2b8 logcat -d | findstr "DIAG"
adb -s e017a252 logcat -d | findstr "DIAG"
```

Single command to clear logs, get Warning and above, and filter "DIAG" messages in both devices:
```sh
adb -s 6ae4c054c2b8 logcat -c; adb -s e017a252 logcat -c;
adb -s e017a252 logcat -d > e017a252.log;adb -s 6ae4c054c2b8 logcat -d > 6ae4c054c2b8.log;adb -s 6ae4c054c2b8 logcat -d | findstr "DIAG";adb -s e017a252 logcat -d | findstr "DIAG"
```