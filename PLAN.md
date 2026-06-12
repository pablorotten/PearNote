# MovieKollections — Implementation Plan

## Goal

Two phones connect P2P to share a movie list. No servers, no desktop. Peer-to-peer using Holepunch's raw libraries (Hyperswarm + Corestore), **not** Autopass.

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
| `hyperbee` | Key-value DB on top of Corestore (movies list) |
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
- Stores movies locally in **Corestore + Hyperbee** at `documentDirectory/moviekollections/`
- Joins a **Hyperswarm** room identified by a shared discovery key
- On connection, replicates its hyperbee to the peer
- On local change (add/remove), broadcasts the diff to connected peers
- On receiving a diff, applies it locally

---

## Steps

### Step 1 — Update `rpc-commands.mjs`

```js
export const RPC_ADD       = 0  // add a movie (send to worklet)
export const RPC_REMOVE    = 1  // remove a movie (send to worklet)
export const RPC_RESET     = 2  // re-render full list (worklet → UI)
export const RPC_MY_INVITE = 3  // own discovery key (worklet → UI)
export const RPC_PEER_JOINED = 4  // peer connected (worklet → UI)
export const RPC_PEER_LEFT   = 5  // peer disconnected (worklet → UI)
```

### Step 2 — Rewrite `backend/backend.mjs`

Bare worklet that:

1. **Starts Corestore** at persistent path — no wipe
2. **Opens a Hyperbee** store for the movie list
3. **Connects to Hyperswarm**:
   - No invite → create simple numeric key (user-typed, e.g. `"1234"`), send to UI via `RPC_MY_INVITE`
   - With invite → join that room using the simple key as discovery topic
   > **v1**: keys are short numbers for easy testing. **v2+**: upgrade to cryptographically random keys.
4. **On peer connection**:
   - Send full local movie list via `RPC_RESET`
   - Listen for incoming movie diffs (add/remove)
5. **On `RPC_ADD` from UI**:
   - Add movie to local Hyperbee
   - Broadcast to connected peers
6. **On `RPC_REMOVE` from UI**:
   - Remove from local Hyperbee
   - Broadcast to connected peers
7. **Persist** every change so data survives restart

### Step 3 — Rewrite `app/index.tsx`

React Native UI with two phases:

**Phase 1 — Pairing:**
- "Create Room" button → generates discovery key
- TextInput for "Enter Room Key" + "Join" button
- Shows own room key (copy to clipboard)

**Phase 2 — Movie List:**
- `FlatList` with movie title, year, director
- "Add Movie" button → opens form (title, year, director)
- Swipe/long-press to delete
- "Share Key" button to copy invite again
- Status indicator: connected/not connected

### Step 4 — Update `app.json`

- `name`: `"MovieKollections"`
- `slug`: `"moviekollections"`
- `android.package`: `"com.moviekollections.app"`
- `ios.bundleIdentifier`: `"com.moviekollections.app"`
- `scheme`: `"moviekollections"`

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

1. Generate a cryptographically random 32-byte key on "Create Room"
2. Encode it as a human-readable phrase or QR code
3. Decode input back to 32-byte key on "Join Room"
4. Use the 32-byte key as the Hyperswarm discovery topic
5. Remove the simple numeric key path entirely

---

## Data Format

Movies are stored in Hyperbee as key-value pairs:

- **Key**: `movie:<timestamp>` (unique per entry)
- **Value**: JSON `["movie", "Title", "Year", "Director"]`

Sync messages over Hyperswarm are newline-delimited JSON:
```
{"type":"add","key":"movie:123","value":["movie","Inception","2010","Christopher Nolan"]}\n
{"type":"remove","key":"movie:123"}\n
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
