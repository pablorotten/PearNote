# P2PKollections — Implementation Plan

## Goal

Two phones connect P2P to share a list. No servers, no desktop. Peer-to-peer using Holepunch's raw libraries (Hyperswarm + Corestore), **not** Autopass.

---

## Current State

| File | Role | Issues |
|---|---|---|
| `app/index.tsx` | Password manager UI | Desktop-pair pattern, password data, uses Autopass |
| `backend/backend.mjs` | Autopass client worklet | Single-writer, `rmSync` on start, password data |
| `rpc-commands.mjs` | RPC enum | `RPC_RESET(0)`, `RPC_MESSAGE(1)` — password-specific |
| `app/index-p2p.tsx` | Experiment: Hyperswarm chat UI | Ephemeral messages, no persistence |
| `backend/backend-p2p.mjs` | Experiment: Hyperswarm chat backend | Ephemeral messages, no persistence |

---

## Libraries (no Autopass)

| Library | Role |
|---|---|
| `hyperswarm` | P2P discovery + encrypted connections |
| `corestore` | Persistent Hypercore storage on each phone |
| `hyperbee` | Key-value DB on top of Corestore (list data) |
| `b4a` | Buffer encoding/decoding |
| `bare-rpc` | Communication between React UI and Bare worklet |
| `graceful-goodbye` | Clean shutdown |

---

## Architecture

```
Phone A                          Phone B
┌──────────────┐                ┌──────────────┐
│  React UI    │                │  React UI    │
│  (index.tsx) │                │  (index.tsx) │
└──────┬───────┘                └──────┬───────┘
       │ RPC                          │ RPC
┌──────▼───────┐                ┌──────▼───────┐
│  Bare        │                │  Bare        │
│  Worklet     │◄── Hyperswarm ─►│  Worklet     │
│  (backend    │    P2P sync    │  (backend    │
│   .mjs)      │                │   .mjs)      │
└──────┬───────┘                └──────┬───────┘
       │                               │
┌──────▼───────┐                ┌──────▼───────┐
│  Corestore   │                │  Corestore   │
│  (persistent │                │  (persistent │
│   storage)   │                │   storage)   │
└──────────────┘                └──────────────┘
```

Each phone:
- Stores data locally in **Corestore + Hyperbee** at `documentDirectory/p2pkollections/`
- Joins a **Hyperswarm** list identified by a shared discovery key
- On connection, replicates its hyperbee to the peer
- On local change (add/remove), broadcasts the diff to connected peers
- On receiving a diff, applies it locally

---

## Steps

### Step 1 — Update `rpc-commands.mjs`

```js
export const RPC_ADD       = 0  // add an item (send to worklet)
export const RPC_REMOVE    = 1  // remove an item (send to worklet)
export const RPC_RESET     = 2  // re-render full list (worklet → UI)
export const RPC_MY_INVITE = 3  // own discovery key (worklet → UI)
export const RPC_PEER_JOINED = 4  // peer connected (worklet → UI)
export const RPC_PEER_LEFT   = 5  // peer disconnected (worklet → UI)
```

### Step 2 — Rewrite `backend/backend.mjs`

Bare worklet that:

1. **Starts Corestore** at persistent path — no wipe
2. **Opens a Hyperbee** store for the list
3. **Connects to Hyperswarm**:
   - No invite → create simple numeric key (user-typed, e.g. `"1234"`), send to UI via `RPC_MY_INVITE`
   - With invite → join that list using the simple key as discovery topic
   > **v1**: keys are short numbers for easy testing. **v2+**: upgrade to cryptographically random keys.
4. **On peer connection**:
   - Send full local list via `RPC_RESET`
   - Listen for incoming diffs (add/remove)
5. **On `RPC_ADD` from UI**:
   - Add item to local Hyperbee
   - Broadcast to connected peers
6. **On `RPC_REMOVE` from UI**:
   - Remove from local Hyperbee
   - Broadcast to connected peers
7. **Persist** every change so data survives restart

### Step 3 — Rewrite `app/index.tsx`

React Native UI with two phases:

**Phase 1 — Pairing:**
- "Create List" button → generates discovery key
- TextInput for "Enter List Key" + "Join" button
- Shows own list key (copy to clipboard)

**Phase 2 — List View:**
- `FlatList` with item details
- "Add Item" button → opens form (title, year, director)
- Swipe/long-press to delete
- "Share Key" button to copy invite again
- Status indicator: connected/not connected

### Step 4 — Update `app.json`

- `name`: `"P2PKollections"`
- `slug`: `"p2pkollections"`
- `android.package`: `"com.p2pkollections.app"`
- `ios.bundleIdentifier`: `"com.p2pkollections.app"`
- `scheme`: `"p2pkollections"`

### Step 5 — Build Bundle

```sh
npx bare-pack --host android --linked --out app/app.bundle.mjs backend/backend.mjs
```

### Step 6 — Verify

```sh
npx tsc --noEmit
```

### Step 7 (Future) — Replace Simple Keys with Secure Random Keys

After v1 works end-to-end with simple numeric keys (e.g. `"1234"`):

1. Generate a cryptographically random 32-byte key on "Create List"
2. Encode it as a human-readable phrase or QR code
3. Decode input back to 32-byte key on "Join List"
4. Use the 32-byte key as the Hyperswarm discovery topic
5. Remove the simple numeric key path entirely

---

## Data Format

Items are stored in Hyperbee as key-value pairs:

- **Key**: `item:<timestamp>` (unique per entry)
- **Value**: JSON `["item", "Title", "Year", "Director"]`

Sync messages over Hyperswarm are newline-delimited JSON:
```
{"type":"add","key":"item:123","value":["item","Inception","2010","Christopher Nolan"]}\n
{"type":"remove","key":"item:123"}\n
```

---

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| P2P library | Hyperswarm (raw) | Not Autopass, full control |
| Storage | Corestore + Hyperbee | Persistent, survives restarts |
| Pairing | Simple numeric key (e.g. `"1234"`) for v1 | Easy to type/test; upgrade to secure random keys later |
| Sync | Full list on connect, diffs on change | Always consistent |
| UI framework | Existing React Native / Expo | No rewrite needed |

---

## Technical Changelog

### 1. Hyperbee constructor crash — `store.get()` required

**Problem**: `new Hyperbee(store, { ... })` crashed because Hyperbee expects a Hypercore instance, not a Corestore.

**Fix**: Call `store.get({ name: 'list' })` first to obtain a Hypercore, then pass that to `new Hyperbee(core, { ... })`.

**Commit**: `8b9eb92`

---

### 2. `swarm.peers.length` — Map has no `.length`

**Problem**: `swarm.peers` is a `Map`, not an array. Accessing `.length` returned `undefined` and in some cases caused the connection handler to throw silently, preventing `peers.add(conn)` from executing.

**Fix**: Replaced `swarm.peers.length` with `peers.size` (using our own `Set` to track connections). Also wrapped the entire connection handler in `try/catch` and moved `peers.add(conn)` to the first line of the handler so the peer is always tracked even if later code fails.

---

### 3. `process is not defined` — Bare runtime crash

**Problem**: After rebuilding the bundle with `bare-pack`, the backend worklet crashed on startup with `Uncaught ReferenceError: process is not defined`. The Bare V8 runtime does not provide a `process` global like Node.js does. A transitive dependency (in the Hyperbee/Corestore chain) references `process` at the top level without a `typeof` guard.

**Symptoms**: Both phones showed the same error in `adb logcat`. The app had worked previously because the old cached `app.bundle.mjs` was from a build that predated the problematic dependency version.

**Fix**: Added `import process from 'bare-process'` and `globalThis.process = process` at the top of `backend/backend.mjs`, before all other imports. The `bare-process` package (already a transitive dependency) provides a Node.js-compatible `process` object for Bare.

```js
import process from 'bare-process'
globalThis.process = process
```

---

### 4. Guest misses connection event — handler registered too late

**Problem**: The guest phone showed "SWARM connection event FIRED" but never "Connection established". The guest's `peers` Set stayed empty, so `broadcast()` sent to 0 peers. One-way sync: host saw the guest, but guest didn't see the host.

**Root cause**: The main `swarm.on('connection')` handler was registered **after** `await discovery.flushed()`. On the guest, Hyperswarm discovers the host during the DHT lookup and initiates a TCP connection. The `connection` event can fire **before** `flushed()` resolves — at which point the handler isn't registered yet. The host wasn't affected because its connection event arrives later (it's the server side accepting the inbound connection).

**Timeline from guest logs**:
```
22:33:24.347  SWARM connection event FIRED    ← event fires (only early handler catches it)
22:33:25.342  Swarm join flushed              ← flushed() resolves
             (main handler registered here)   ← too late, event already gone
```

**Fix**: Moved `const peers = new Set()` and the entire `swarm.on('connection', ...)` handler to **before** `swarm.join()`, so the handler is always registered before any connection can possibly arrive.

```
Before:  swarm.join() → await flushed() → register handler  (guest misses event)
After:   register handler → swarm.join() → await flushed()   (always catches event)
```

---

### 5. Android bottom nav bar overlap

**Problem**: The FAB (floating action button) and list items were hidden behind the Android system navigation bar.

**Fix**: Added `paddingBottom: 60` to the main container on Android, and positioned the FAB at `bottom: 70`.

---

### 6. Stale experiment files cleanup

**Problem**: Old experiment files (`app/index-p2p.tsx`, `backend/backend-p2p.mjs`) and leftover files from the password manager tutorial were cluttering the repo.

**Fix**: Removed all stale experiment files, untracked `crash.log` from git.

---

### 7. Misc build and tooling issues

| Issue | Fix |
|---|---|
| `bare-pack --target` flag removed | Use `--host` instead (renamed in bare-pack v2) |
| `documentDirectory` import moved in Expo SDK 55 | Import from `'expo-file-system/legacy'` |
| `android/local.properties` missing | Must be created manually with `sdk.dir=...` |
| ADB version conflicts (MEmu emulator) | Copy SDK `adb.exe` over MEmu's; reboot if zombie process |
| Autopass version mismatch | Both sides must use same major version; project uses `^3.4.1` |

---

### Build workflow

Every time `backend/backend.mjs` changes:

```sh
npx bare-pack --host android --linked --out app/app.bundle.mjs backend/backend.mjs
npm run android
```

`bare-pack` bundles the backend JS + all dependencies into a single file. `npm run android` builds the APK (which includes the bundle as an asset) and installs it on the connected device.
