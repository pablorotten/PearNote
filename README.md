# MovieKollections

## Commands

- 📱phone1: 6ae4c054c2b8
- 📱phone2: e017a252

Install in specifc device:
```sh
adb -s e017a252 install -r android/app/build/outputs/apk/debug/app-debug.apk; adb -s e017a252 reverse tcp:8081 tcp:8081; adb -s e017a252 shell am start -n to.holepunch.bare.expo/.MainActivity 
```

### Logs

Log device `6ae4c054c2b8`
```sh
adb -s 6ae4c054c2b8 logcat -c
adb -s 6ae4c054c2b8 logcat *:W -d > 6ae4c054c2b8.log
```

Log device `e017a252`
```sh
adb -s e017a252 logcat -c
adb -s e017a252 logcat *:W -d > e017a252.log
```

Log specific app messages
```sh
adb -s 6ae4c054c2b8 logcat -d | findstr "DIAG"
adb -s e017a252 logcat -d | findstr "DIAG"
```