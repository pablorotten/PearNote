# PearNote Project Plan

## 🎯 Project Goal

Create a **desktop/mobile app** that demonstrates P2P (peer-to-peer) list sharing using the **Pear framework** from Holepunch. This is primarily for creating a **video tutorial showcasing how Pear works**.

### Key User Flow

#### Create a new list
1. User generates a "pairing code" (discovery key) on one device
2. User enters a list — a single shared list.
3. User adds elements to the list
4. User shares the pairing code with another device (QR code, copy-paste, etc.)
5. Second device enters the pairing code
6. Both devices see the same list and can add/remove items in real-time (P2P sync)

---

## 🔧 Technical Stack

Possible stack to be used:
- **Pear Runtime**: High-level P2P framework wrapping Hypercore + Hyperswarm
- **Bare Runtime**: Lightweight JavaScript runtime (alternative to Node.js)
- **Hypercore**: Append-only cryptographic log for data replication
- **Hyperswarm**: P2P networking protocol for peer discovery
- **React Native + Expo**: Cross-platform mobile UI framework
- **State management**: Local storage? Hypercore-backed DB?

---

## 💡 Success Criteria

**Minimum Viable Demo**:
- ✅ Android app
- ✅ Create/edit/delete lists
- ✅ Two instances sync
- ✅ Pairing code system
  
---

## Handoff

We start from this tutorial <https://docs.pears.com/guide/making-a-bare-mobile-app.html> and some modifications I did to make it work. The modified code is in C:\Users\pablo\DEV\projects\bare-mobile-application so you can take a look but it's exactly the same as this one.

P2P mobile app for shared lists. Two phones sync items directly — no desktop, no server. Phone A adds an element, phone B sees it instantly (or when back online).

This initial project works by doing:
```sh
npm i b4a bare-fs bare-rpc corestore autopass @react-native-clipboard/clipboard graceful-goodbye
npm i bare-pack @types/b4a --save-dev
npm run android
```

> [!WARNING]
> VERY IMPORTANT: The starting project connects a phone to a desktop worker (phone is a "client" and desktop is the "server"). For PearNote, we want **phone-to-phone P2P** with no desktop. This means both phones must run the same Bare worklet code and pair with each other as equals (multi-writer). The tutorial's single-worker pattern won't work for our use case.

### Tech Stack

- **Template**: `https://github.com/holepunchto/bare-expo.git`
- **Runtime**: Expo SDK 55 + `react-native-bare-kit` (Bare worklet for P2P)
- **Libraries**: `autopass`, `corestore`, `bare-rpc`, `graceful-goodbye`, `expo-file-system`, `bare-pack`

### Key Learnings from Password App (this repo)

1. `pear run` is deprecated (removed June 2026)
Don't use it. Use `pear-runtime` for running Bare code (Node.js host + Bare worker).
See `autopass-invite/run.js` + `autopass-invite/server-worker.js` for the pattern.

2. `bare-pack --target` → `--host`
```bash
npx bare-pack --host android --linked --out app/app.bundle.mjs backend/backend.mjs
```
`--target` was renamed to `--host` in bare-pack v2.

3. `documentDirectory` moved in Expo SDK 55
```tsx
import { documentDirectory } from 'expo-file-system/legacy'
```

4. Android local.properties
Expo/Gradle does NOT create it. Must be manual:
```properties
sdk.dir=C:\\Users\\<user>\\AppData\\Local\\Android\\Sdk
```

5. ADB version conflicts
MEmu emulator installs its own ADB (v40) which conflicts with SDK ADB (v41). Uninstall MEmu or copy SDK `adb.exe` over MEmu's. Reboot if zombie process remains.

6. Autopass version compatibility
Both sides must use the same `autopass` major version. The tutorial uses 2.x but npm installs 3.x. The mobile app in this project uses `autopass@^3.4.1`.

### Architecture for PearNote (P2P Phone ↔ Phone)

#### Directory structure
```
PearNote/
├── app/
│   ├── index.tsx          # UI
│   └── app.bundle.mjs     # generated bundle
├── backend/
│   └── backend.mjs        # Bare worklet (P2P logic)
├── rpc-commands.mjs       # RPC command IDs
└── (no autopass-invite/ — both phones are equal peers)
```

#### `backend/backend.mjs` — multi-writer, NO `rmSync`
```
- Create Corestore at `documentDirectory/PearNote/`
- Create Autopass from existing store (don't delete!)
- If an invite is provided → pair with it (Autopass.pair)
- Generate own invite → send to UI via RPC
- Listen for updates → forward to UI
- `pass.add()` items from UI via RPC
```

#### `app/index.tsx` — two-phase flow
```
Phase 1: Start worklet with invite (or empty)
         → Receive own invite from backend
         → Display own invite (for other phone to copy)

Phase 2: Show list + "Add element" TextInput + "Share invite" button
         → Changes sync automatically via autopass `update` event
```

#### RPC Commands
```js
RPC_ADD       = 0  // add item (bidirectional)
RPC_RESET     = 1  // re-render full list
RPC_MY_INVITE = 2  // backend sends its invite
```

#### Data format
```json
["item", "Inception", "2010", "Christopher Nolan"]
["item", "The Matrix", "1999", "The Wachowskis"]
```

### Multi-writer pairing flow
```
Phone A starts → creates vault, generates invite
Phone A sends invite to Phone B (QR code, copy-paste, etc.)
Phone B starts WITH Phone A's invite
  → Phone B pairs with A
  → Phone B generates its OWN invite
Phone B sends invite to Phone A
Phone A restarts WITH Phone B's invite
  → Now both are writers → both can add, both receive updates
```

#### Persistence
Each phone stores its own Corestore at `documentDirectory/PearNote/`.
Data survives app restarts. Reconnect later to sync missed changes.

### Key files from this repo to reference

| File | Purpose |
|---|---|
| `autopass-invite/server-worker.js` | Pattern: bare worker with autopass, createInvite, seed |
| `backend/backend.mjs` | Bare worker with autopass pair + RPC |
| `app/index.tsx` | UI with worklet, RPC handling, invite input |
| `rpc-commands.mjs` | RPC enum pattern |
| `autopass-invite/run.js` | Node.js host using pear-runtime (for desktop seeding) |

### What NOT to do
- Don't use `pear run` (deprecated)
- Don't use `--target` flag (use `--host`)
- Don't import `documentDirectory` from `'expo-file-system'` (use `'/legacy'`)
- Don't forget `local.properties`
- Don't mix autopass major versions
- Don't `rmSync` the store on start (that was for the password app's "clean start" pattern)
