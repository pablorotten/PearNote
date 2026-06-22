# PearNote Project Plan

- [PearNote Project Plan](#pearnote-project-plan)
  - [🎯 Project Goal](#-project-goal)
    - [Key User Flow](#key-user-flow)
      - [Create a new note](#create-a-new-note)
  - [🔧 Technical Stack](#-technical-stack)
  - [💡 Success Criteria](#-success-criteria)
  - [Architecture](#architecture)
    - [Directory structure](#directory-structure)
    - [Backend (`backend/backend.mjs`)](#backend-backendbackendmjs)
    - [Frontend (`app/`)](#frontend-app)
    - [RPC Commands](#rpc-commands)
    - [Data Format](#data-format)
    - [History Persistence](#history-persistence)
    - [Pairing Flow](#pairing-flow)
    - [Rejoin Flow](#rejoin-flow)
    - [Key Decisions](#key-decisions)
    - [Key Libraries](#key-libraries)
    - [What NOT to do](#what-not-to-do)

## 🎯 Project Goal

Create a **mobile app** that demonstrates P2P (peer-to-peer) list sharing using **Autopass** (Autobase + BlindPairing) from Holepunch. Two phones sync notes directly — no servers, no desktop. Primarily for creating a **video tutorial showcasing how P2P sync works**.

### Key User Flow

#### Create a new note
1. User creates a note on one device → gets an invite code
2. User adds items to the note
3. User shares the invite code with another device (QR code, copy-paste)
4. Second device enters the invite code
5. Both devices see the same list and can add/remove items in real-time (P2P sync)

---

## 🔧 Technical Stack

- **Runtime**: Expo SDK 55 + `react-native-bare-kit` (Bare worklet for P2P)
- **P2P Sync**: `autopass@^3.4.1` (Autobase + BlindPairing for multi-writer CRDT)
- **Storage**: `corestore@^7.10.1` (persistent Hypercore storage on each phone)
- **Networking**: Hyperswarm (DHT-based P2P peer discovery, built into Autopass)
- **UI**: React Native + Expo Router
- **RPC**: `bare-rpc@^1.3.3` (IPC between React UI and Bare worklet)
- **QR Code**: `react-native-qrcode-svg` + `expo-camera`
- **State Management**: React Context (`NoteContext` + `useNote` hook)
- **Local History**: `expo-file-system` (persists note history to JSON on disk)

---

## 💡 Success Criteria

**Minimum Viable Demo**:
- ✅ Android app
- ✅ Create/edit/delete notes
- ✅ Two instances sync
- ✅ Invite code system (text + QR)
- ✅ Note history with persistent storage
- ✅ Rejoin existing notes

---

## Architecture

```
Phone A                                    Phone B
┌──────────────────┐                      ┌──────────────────┐
│  React Native    │                      │  React Native    │
│  ┌────────────┐  │                      │  ┌────────────┐  │
│  │ MenuScreen │  │                      │  │ MenuScreen │  │
│  │ ListScreen │  │                      │  │ ListScreen │  │
│  └─────┬──────┘  │                      │  └─────┬──────┘  │
│        │ IPC     │                      │        │ IPC     │
│  ┌─────▼──────┐  │                      │  ┌─────▼──────┐  │
│  │ Bare       │  │                      │  │ Bare       │  │
│  │ Worklet    │  │                      │  │ Worklet    │  │
│  │ (backend   │  │                      │  │ (backend   │  │
│  │  .mjs)     │  │                      │  │  .mjs)     │  │
│  └─────┬──────┘  │                      │  └─────┬──────┘  │
│        │         │                      │        │         │
│  ┌─────▼──────┐  │    Autopass CRDT     │  ┌─────▼──────┐  │
│  │ Autopass   │◄─┼───(Autobase +  ─────┼─►│ Autopass   │  │
│  │            │  │    BlindPairing)     │  │            │  │
│  │ Corestore  │  │    Hyperswarm DHT    │  │ Corestore  │  │
│  │ (local DB) │  │                      │  │ (local DB) │  │
│  └────────────┘  │                      │  └────────────┘  │
└──────────────────┘                      └──────────────────┘
```

Each phone:
- Stores data locally in **Corestore + Autopass** at `documentDirectory/pearnote/<sessionId>/`
- Autopass wraps **Autobase** (multi-writer Hypercore) — each peer writes to their own Hypercore fork
- **BlindPairing** handles secure invite-based pairing
- **Hyperswarm** (DHT) handles peer discovery and connection
- On local change (add/remove), Autopass merges deterministically via CRDT
- Replaying all events in order always produces the same final state — no sync conflicts

### Directory structure
```
PearNote/
├── app/
│   ├── index.tsx              # Root — NoteProvider + screen router
│   ├── types.ts               # Item, NoteEntry types
│   ├── styles.ts              # All UI styles (dark theme)
│   ├── screens/
│   │   ├── MenuScreen.tsx     # Create/Join note + history
│   │   └── ListScreen.tsx     # List view + items
│   ├── hooks/
│   │   ├── useNote.ts         # All app logic (worklet, RPC, state)
│   │   └── NoteContext.ts     # React Context provider
│   ├── components/
│   │   ├── LoadingSpinner.tsx
│   │   └── QRCodeModal.tsx
│   └── app.bundle.mjs         # Generated backend bundle
├── backend/
│   └── backend.mjs            # Bare worklet (P2P logic)
├── rpc-commands.mjs           # RPC command IDs
├── plugins/                   # Expo config plugins (if any)
└── assets/images/             # Icons, splash screen
```

### Backend (`backend/backend.mjs`)

Bare worklet that handles all P2P logic. Runs in a separate thread from React Native.

**Three modes** (args: `[documentDirectory, mode, storageId?]`):

| Mode | storageId | Behavior |
|------|-----------|----------|
| `create` | `(none)` | Creates new Corestore at `pearnote/<timestamp>`, generates invite |
| `join` | invite code | Creates new Corestore, pairs via BlindPairing, generates invite |
| `rejoin` | folder name | Loads existing Corestore (same Autobase), generates new invite |

**Backend functions:**
- `init()` — starts Corestore, Autopass, Hyperswarm, sets up RPC
- `addItem(item)` — `pass.add('item:<timestamp>', JSON.stringify(['item', title]))`
- `removeItem(key)` — `pass.remove(key)`
- `clearAll()` — removes all keys from Autopass
- `setListName(name)` — `pass.add('_note_name', JSON.stringify(['_name', name]))`
- `notifyUI()` — reads full list via `pass.list()`, sends to frontend via RPC

### Frontend (`app/`)

**Screen flow:**
```
MenuScreen → [Create Note] → ListScreen
           → [Join Note]   → ListScreen
           → [Tap history] → ListScreen (rejoin)
```

**State management:**
- `NoteContext` provides all state and functions to both screens
- `useNote` hook contains all logic: worklet lifecycle, RPC handling, history persistence
- Note history saved to `documentDirectory/note-history.json`

**Data flow:**
1. User taps "Create Note" → `startWorklet('create', undefined, name)`
2. Worklet starts → sends `RPC_MY_INVITE` with `storageId|invite`
3. Frontend saves to history, shows invite code
4. Peer connects → `RPC_PEER_JOINED` → green dot
5. Data changes → `pass.on('update')` → `notifyUI()` → `RPC_RESET` → `setItems()`

### RPC Commands

**Frontend → Backend:**

| ID | Command | Data | Action |
|----|---------|------|--------|
| 0 | `RPC_ADD` | JSON `['item', title]` | Add item to Autopass |
| 1 | `RPC_REMOVE` | key string | Remove item from Autopass |
| 7 | `RPC_CLEAR` | empty | Remove all items |
| 10 | `RPC_SET_NAME` | name string | Set note name (`_note_name` key) |

**Backend → Frontend:**

| ID | Command | Data | Action |
|----|---------|------|--------|
| 2 | `RPC_RESET` | JSON array of items | Replace full item list |
| 3 | `RPC_MY_INVITE` | `storageId|invite` | Save invite, show alert |
| 4 | `RPC_PEER_JOINED` | `'connected'` | Show green dot |
| 5 | `RPC_PEER_LEFT` | `'disconnected'` | Hide green dot |
| 6 | `RPC_DIAG` | message string | Console log (debug) |
| 8 | `RPC_ERROR` | error string | Show error alert |
| 11 | `RPC_CLEAR_DONE` | empty | Leave note (after clear) |

### Data Format

Items in Autopass are stored as key-value pairs:

**Regular items:**
- Key: `item:<timestamp>` (e.g., `item:1718901234567`)
- Value: `["item", "<title>"]` (JSON string)

**Note name (special key):**
- Key: `_note_name`
- Value: `["_name", "<note name>"]` (JSON string)

Example Autopass entries for a note titled "Groceries" with two items:
```
item:1718901234567 → ["item", "Milk"]
item:1718901234568 → ["item", "Bread"]
_note_name        → ["_name", "Groceries"]
```

### History Persistence

Note history is stored in `documentDirectory/note-history.json`:
```json
[
  { "id": "mqham920", "name": "Groceries" },
  { "id": "abc123xy", "name": "Work Tasks" }
]
```
- `id` = storage folder name (used to rejoin)
- `name` = user-assigned note name (synced across peers)

### Pairing Flow

```
Phone A: Create Note → generates invite → shows code
Phone B: Join Note (paste code from A) → pairs via BlindPairing
  → Both are now multi-writer peers
  → Both can add/remove items
  → Changes sync automatically via Autopass CRDT
```

### Rejoin Flow

```
Phone A: Create Note → leaves (terminates worklet)
Phone A: Taps note in history → rejoin mode
  → Loads same Corestore → same Autobase → same data
  → Generates new invite for new sessions
```

### Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| P2P library | Autopass (Autobase + BlindPairing) | Multi-writer CRDT with deterministic merge — fixes stale-peer desync problem |
| Storage | Corestore + Autopass | Persistent, survives restarts, built-in multi-writer replication |
| Pairing | BlindPairing invite codes (z32 strings) | Cryptographic security, no need for numeric keys |
| Sync model | Event log (append-only) | Every add/remove is an event — replaying produces correct state |
| Offline edits | CRDT merge (Autobase) | Peers can edit offline, changes merge deterministically on reconnect |
| UI framework | React Native + Expo | Cross-platform, fast iteration |
| RPC | bare-rpc (IPC) | Clean separation between React thread and Bare worklet thread |
| Note names | Special key `_note_name` in Autopass | Synced across peers like any other entry |
| History | Local JSON file (`expo-file-system`) | Simple, no native deps needed for history persistence |

### Key Libraries

| Library | Purpose |
|---------|---------|
| `autopass` | Multi-writer P2P key-value store (wraps Autobase + BlindPairing) |
| `corestore` | Persistent Hypercore storage on filesystem |
| `bare-rpc` | IPC between React Native and Bare worklet |
| `react-native-bare-kit` | Runs Bare worklet as a separate thread |
| `b4a` | Buffer encoding/decoding |
| `graceful-goodbye` | Clean shutdown (not yet implemented) |
| `expo-file-system` | Local file persistence (history) |
| `react-native-qrcode-svg` | QR code generation |

### Test Flow

1. **Create note** (Phone A): open app → tap "Create Note" → wait for loading spinner → verify "Note Created!" alert with invite code appears → verify items appear on screen
2. **Join** (Phone B): open app → paste invite code from A → tap "Join Note" → wait for loading → verify both phones show same list
3. **Add item**: type title on A → tap + → verify item appears on both phones within seconds
4. **Remove item**: tap X on an item → verify it disappears on both phones
5. **Leave and re-enter**: tap ← on Phone A → tap the note in "Your Notes" history → should rejoin with same items

### Known Issues

- History items store old invite codes; tapping them now **copies** the code instead of trying to join a dead note. Always use **Create Note** for new sessions.
- Each note session uses a unique timestamp-based storage path (`pearnote/<sessionId>`). Old session dirs accumulate but are harmless.

### What NOT to do
- Don't use `pear run` (deprecated)
- Don't use `--target` flag (use `--host`)
- Don't import `documentDirectory` from `'expo-file-system'` (use `'expo-file-system/legacy'`)
- Don't forget `local.properties` for Android SDK path
- Don't mix autopass major versions between peers
- Don't `rmSync` the store on start
- Don't use `bareKit.terminate()` without `pass.suspend()` first (causes stale file locks)
- Don't pass arrays to `pass.add()` value — must be string (use `JSON.stringify()`)
- Don't use unique timestamp-based paths for every session — reuse `storageId` for rejoin
