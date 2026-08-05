# PearNote Cheatsheet

## Devices

- 📱 Phone A: `6ae4c054c2b8`
- 📱 Phone B: `e017a252`

## Setup

```sh
npm install
npx bare-pack --host android --linked --out app/app.bundle.mjs backend/backend.mjs
```

> [!WARNING]
> `npx expo prebuild --clean` wipes the `android/` folder, including `local.properties` (SDK path).
> If Gradle fails with `SDK location not found... set the sdk.dir path in local.properties`, recreate it:
> ```sh
> Set-Content -Path android/local.properties -Value "sdk.dir=C:/Users/pablo/AppData/Local/Android/Sdk"
> ```
> 

## Development

```sh
npm run android
```

> [!WARNING]
> `npm run android` builds a debug APK. The JS bundle is NOT inside the APK — it's downloaded live from Metro over USB. Changes to `app/` hot-reload automatically.
>
> `Unplug = Metro disappears → app can't fetch the JS bundle → crash`

> [!NOTE]
> If you change `backend/`, rebuild the bundle first:
> ```sh
> npx bare-pack --host android --linked --out app/app.bundle.mjs backend/backend.mjs
> ```

## Install on Specific Device

```sh
# Phone B (e017a252)
adb -s e017a252 install -r android/app/build/outputs/apk/debug/app-debug.apk
adb -s e017a252 reverse tcp:8081 tcp:8081
adb -s e017a252 shell am start -n com.pearnote.app/.MainActivity

# Phone A (6ae4c054c2b8)
adb -s 6ae4c054c2b8 install -r android/app/build/outputs/apk/debug/app-debug.apk
adb -s 6ae4c054c2b8 reverse tcp:8081 tcp:8081
adb -s 6ae4c054c2b8 shell am start -n com.pearnote.app/.MainActivity

# One-liner Phone B
adb -s e017a252 install -r android/app/build/outputs/apk/debug/app-debug.apk; adb -s e017a252 reverse tcp:8081 tcp:8081; adb -s e017a252 shell am start -n com.pearnote.app/.MainActivity

# One-liner Phone A
adb -s 6ae4c054c2b8 install -r android/app/build/outputs/apk/debug/app-debug.apk; adb -s 6ae4c054c2b8 reverse tcp:8081 tcp:8081; adb -s 6ae4c054c2b8 shell am start -n com.pearnote.app/.MainActivity
```

## Release APK

Generate, install and launch a standalone APK (no Metro needed):

```sh
npx expo run:android --variant release
adb -s e017a252 install -r android/app/build/outputs/apk/release/app-release.apk
adb -s e017a252 shell am start -n com.pearnote.app/.MainActivity
adb -s 6ae4c054c2b8 shell am start -n com.pearnote.app/.MainActivity
```

## Regenerate Native Project

After changing icons, splash, or `app.json`:

```sh
npx expo prebuild && npm run android
```

## Uninstall

```sh
adb -s 6ae4c054c2b8 uninstall com.pearnote.app
adb -s e017a252 uninstall com.pearnote.app

# Both at once
adb -s 6ae4c054c2b8 uninstall com.pearnote.app; adb -s e017a252 uninstall com.pearnote.app
```

## ADB Utilities

```sh
# Restart adb (gentle)
adb kill-server; adb start-server

# Restart adb (hard)
taskkill /F /IM adb.exe 2>$null; Start-Sleep -Seconds 2; adb start-server
```

## Logs

```sh
# Clear logs on both devices
adb -s 6ae4c054c2b8 logcat -c; adb -s e017a252 logcat -c

# Dump filtered logs (ReactNativeJS + Bare) to files
adb -s 6ae4c054c2b8 logcat -s "ReactNativeJS:D" "to.holepunch.bare.expo:D" "*:S" -d > logs/6ae4c054c2b8.log
adb -s e017a252 logcat -s "ReactNativeJS:D" "to.holepunch.bare.expo:D" "*:S" -d > logs/e017a252.log

# Dump warnings and above
adb -s 6ae4c054c2b8 logcat *:W -d > logs/6ae4c054c2b8.log
adb -s e017a252 logcat *:W -d > logs/e017a252.log

# Filter DIAG messages only
adb -s 6ae4c054c2b8 logcat -d | findstr "DIAG"
adb -s e017a252 logcat -d | findstr "DIAG"

# All-in-one: clear, dump warnings, dump DIAG
adb -s 6ae4c054c2b8 logcat -c; adb -s e017a252 logcat -c;
adb -s e017a252 logcat -d > e017a252.log; adb -s 6ae4c054c2b8 logcat -d > 6ae4c054c2b8.log;
adb -s 6ae4c054c2b8 logcat -d | findstr "DIAG"; adb -s e017a252 logcat -d | findstr "DIAG"
```

## Extract app files

```sh
adb shell run-as com.pearnote.app ls -R /data/data/com.pearnote.app/files/pearnote/
adb shell run-as com.pearnote.app cat /data/data/com.pearnote.app/files/pearnote/CORESTORE
adb shell "run-as com.pearnote.app tar -tf /data/data/com.pearnote.app/files/backup_full.tar"
adb pull /data/data/com.pearnote.app/files/backup_full.tar ./backup_full.tar
adb exec-out "run-as com.pearnote.app cat /data/data/com.pearnote.app/files/backup_full.tar" > backup_full2.tar
```