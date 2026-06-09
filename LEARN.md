# Learn

## Commands
```sh
git clone https://github.com/holepunchto/bare-expo.git autopass-mobile-example
cd .\autopass-mobile-example\
scoop install openjdk23
npm i b4a bare-fs bare-rpc corestore autopass @react-native-clipboard/clipboard graceful-goodbye
npm i bare-pack @types/b4a --save-dev
ls
mkdir backend
wsl touch backend/backend.mjs
wsl touch rpc-commands.mjs
Set-Content -Path .\rpc-commands.mjs -Value @"`
export const RPC_RESET = 0`
export const RPC_MESSAGE = 1`
npx bare-pack --host android-arm64 --host android-x64 --host ios-arm64 --linked --out app/app.bundle.mjs backend/backend.mjs
npm run android
npm run android
adb logcat | findstr "bare"
```

## Libraries used

Frontend Framework:
* React 19.2.0 — UI framework
* React Native 0.83.6 — Mobile framework (cross-platform iOS/Android)
* Expo ~55.0.23 — React Native development platform & build tool
* TypeScript 5.3.3 — Type-safe JavaScript
Bare Runtime & IPC:
* react-native-bare-kit ^0.13.3 — Worklet support for running native code
* bare-rpc ^1.3.2 — Remote Procedure Call (frontend-backend communication)
* bare-fs ^4.7.2 — File system access
* bare-path — Path utilities
* bare-url — URL utilities
* bare-pack ^2.0.2 — Bundler/packager for Bare modules
Password Sync & Storage:
* autopass ^3.4.1 — Protocol for secure password syncing
* corestore ^7.10.0 — Distributed storage system
* b4a ^1.8.1 — Buffer utilities (b4a = buffer for all)
Native Utilities:
* @react-native-clipboard/clipboard ^1.16.1 — Copy-to-clipboard functionality
* expo-file-system — File system access
* expo-constants, expo-linking, expo-router — Expo utilities
* graceful-goodbye ^1.3.3 — Graceful shutdown handling
Routing & UI:
* expo-router ~55.0.14 — File-based routing
* react-native-screens, react-native-safe-area-context — Screen management

### P2P libraries:

Holepunch P2P Data Structures:
* Hypercore — Append-only logs (foundation for distributed data)
* Hyperbee — B-tree database built on Hypercore
* Hyperdrive — Distributed filesystem
* Autobase — Collaborative state machine base layer
In this Project Specifically:
* autopass ^3.4.1 — P2P pairing & identity protocol (used for secure password syncing)
* corestore ^7.10.0 — Storage manager for distributed cores (manages local + remote data)
* bare-rpc ^1.3.2 — P2P RPC communication between peers
* bare-fs ^4.7.2 — P2P filesystem
