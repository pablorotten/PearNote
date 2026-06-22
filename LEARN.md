# Learnings from PearNote

## Q: What does 🟢 Connected mean inside a list?

When the backend receives a Hyperswarm connection — `swarm.on('connection', ...)` fires, which sends `RPC_PEER_JOINED` to the UI.

It means **at least one other peer is directly connected** via the P2P swarm. If you're alone in the list, it shows disconnected. If another phone is in the same list and the swarm connected, it turns green.

## Q: How many states does the connection logic have?

After loading completes (spinner disappears), there are 2 states:

| State | Condition | What's happening |
|---|---|---|
| **Disconnected** | After loading, no connection event | You're in the list, swarm is listening, but no other peer connected yet |
| **Connected** 🟢 | `RPC_PEER_JOINED` received | At least one peer connected via Hyperswarm |

There's also a **Loading** (spinner) phase before these states — backend starting up, loading local storage, joining the swarm.

The "searching for peers" phase is invisible to the user. Hyperswarm continuously looks for peers on the discovery key, but the UI only reflects it once a peer actually connects.

So the full flow is:

```
Loading → Disconnected (swarm searching in background) → Connected 🟢 (peer found)
                                                          → Disconnected (peer left)
```

## Q: This "searching" is periodic? Does it re-search from time to time?

Hyperswarm uses a **DHT (distributed hash table)** under the hood. When you call `swarm.join()`, it:

1. **Announces** your presence to the DHT for that discovery key
2. **Looks up** other peers already in that topic

The DHT announcements have a **time-to-live (TTL)**, so Hyperswarm automatically **re-announces** every ~5-10 minutes to keep your presence alive. It's not a manual search loop — just the DHT's natural refresh cycle.

When a new peer joins the same topic later, the DHT notifies both sides and Hyperswarm creates a direct connection. No polling or re-joining needed — it's all event-driven.

## Q: So it's like WebSocket? Bidirectional communication?

Exactly. Hyperswarm connections are **persistent TCP links** — both sides can send data anytime, like WebSocket. Once a peer connects, data flows both ways until someone disconnects.

Unlike HTTP where you poll, the DHT announces your availability and peers connect when they see you. It's event-driven, not request-response.

## Q: Does the loading spinner wait for peer sync?

No. The spinner waits for the backend startup sequence:

1. `await bee.ready()` — load local Corestore data from disk (fast, <100ms)
2. `await discovery.flushed()` — Hyperswarm finishes setting up for peer discovery
3. `notifyUI()` — read local Hyperbee and send data to the UI

It does **not** wait for peer sync. The spinner disappears as soon as local data is sent to the UI. Sync from other peers arrives in the background and updates the list whenever a peer connects.

Waiting for sync would be bad: if no peers are online, the user would be stuck on the spinner forever. Show local data instantly, sync arrives when peers connect.

## Q: If all peers leave a list, is the data lost? Can a peer sync later?

Yes, if you're the only peer in a list and you leave, your data is still saved **locally** on your device (in Corestore on the filesystem). It's not lost — it's just not reachable over the network.

When you re-enter the same list:
1. Corestore loads your local data and shows it immediately (no sync needed).
2. Hyperswarm re-joins the DHT topic and looks for peers.

The only way another peer can see your data is if **both of you are in the list at the same time**. If you have the data and the other peer doesn't, they sync from you when they connect.

## Q: Can't one device seed multiple lists at the same time?

Technically yes. Each list is a separate `Worklet` instance (a Bare runtime process) with its own Corestore + Hyperswarm swarm. You could spawn multiple worklets in parallel and keep them running in the background.

The cost per idle list:
- **CPU**: Near zero — just listening for events
- **Memory**: ~5-10MB per worklet (JS runtime + Corestore index)
- **Network**: DHT re-announce every ~5-10 min per list, negligible bandwidth
- **Battery**: Comparable to keeping a WebSocket connection open per list

For 2-3 lists it's nothing. For 30 lists on mobile it becomes heavy:
- **150-300MB** memory just for the idle worklets
- 30 concurrent Hyperswarm topics in one process isn't well-tested on mobile
- Battery drain from keep-alive traffic

At that scale you'd want a different architecture — a single daemon multiplexing all lists, or a desktop seed relay.

For PearNote as a demo: sync happens only when two users are **both in the same list at the same time**. If one leaves, the list goes offline until they return.

## Q: What happens when peers desync? Can deletions get re-introduced by stale peers?

Yes, this is a real problem in the current implementation. Scenario:

1. Peers A and B are synced with the same list
2. B disconnects
3. A removes some items
4. B reconnects, loads its stale local data (still has the deleted items)
5. B's `sendFullList` sends its stale data to A
6. The deleted items pop back up in A's list

**Why this happens:** The current `handleSync` is purely additive:

```js
async function handleSync(items) {
  for (const { key, value } of items) {
    const existing = await bee.get(key)
    if (!existing) await bee.put(key, value)  // only adds, never deletes
  }
  await notifyUI()
}
```

It only adds missing items — it never removes them. And `sendFullList` sends the sending peer's data to the receiving peer (not the other way). There's no "this is the authoritative version" concept.

**Is this a fundamental P2P limitation?**

No — it's a design choice in this specific implementation. Here are ways to solve it:

- **Event log (Hypercore's natural model)**: Instead of storing the latest state (key-value in Hyperbee), store every `add` and `remove` as entries in an append-only log. On reconnect, peers replay the full event log and converge on the same final state. This is how Hypercore is designed to be used.

- **Version counter**: Each peer bumps a version number on every change. On reconnect, compare versions — the peer with the higher version wins and its full list replaces the other's.

- **Tombstones**: Store removals as explicit entries (`['tombstone', key]`). During merge, tombstones cancel out adds. Both peers converge on the same set.

- **Last-write-wins with timestamps**: Each entry has a timestamp. On merge, the newest timestamp wins for each key.

The current code uses Hyperbee (key-value store built on Hypercore) and treats deletions as "remove the key" — losing the event history. Hypercore's append-only log naturally preserves every change, which is the right tool for this problem.

## Q: How does a developer need to think about this architecture?

Forget about servers. Think of each device as a node that holds its own piece of data.

**The mindset shift:**
- No "database in the cloud" — each device has its own Corestore (append-only log) on the filesystem
- No "API calls" — peers connect directly via Hyperswarm and exchange messages over persistent TCP links
- No "server always running" — data only flows while at least two peers are in the same list simultaneously
- No "polling" — the DHT announces your presence, peers connect when they see you, everything is event-driven

**The mental model:**
```
Device A (list "1234") ←→ Hyperswarm DHT ←→ Device B (list "1234")
    │                                                 │
    ├─ Corestore (local disk)                         ├─ Corestore (local disk)
    ├─ Hyperbee (key-value)                           ├─ Hyperbee (key-value)
    └─ Worklet (Bare runtime)                         └─ Worklet (Bare runtime)
```

Both devices run identical code. There's no client/server, no master/slave. Each writes to its own Corestore and broadcasts changes. When a peer connects, they exchange their full list and merge.

**Limitations:**
- If all peers leave a list, the data is **offline** until someone re-enters
- There's no persistent storage "in the network" — only on devices
- Sync is real-time only (both peers must be connected)
- Mobile battery/memory limits how many lists one device can seed in background
- No history or conflict resolution beyond "last write wins"

This is the pure P2P trade-off: no servers to maintain, but no guarantees either.

## Q: How does Autopass change the architecture?

We replaced Hyperbee (key-value store) + custom broadcast messages with **Autopass**.

**Before (Hyperbee):**
```
Peer A                   Peer B
  │                        │
  ├─ Hyperbee (local)      ├─ Hyperbee (local)
  ├─ Hyperswarm topic      ├─ Hyperswarm topic
  └─ Custom JSON messages  └─ Custom JSON messages
       (add/remove/sync)
```

Every peer sent their own add/remove/sync messages over the swarm. Sync was purely additive (never deleted). Deletions were lost when stale peers reconnected.

**After (Autopass):**
```
Peer A                   Peer B
  │                        │
  ├─ Autopass (local)      ├─ Autopass (local)
  │   └─ Autobase          │   └─ Autobase
  │       ├─ Own Hypercore │       ├─ Own Hypercore
  │       └─ Shared view   │       └─ Shared view
  └─ BlindPairing invite   └─ BlindPairing invite
```

Autopass wraps **Autobase** (multi-writer Hypercore). Each peer writes to their own Hypercore fork. Autopass merges all forks deterministically using a CRDT — every `add` and `remove` is an event in the append-only log. Replaying all events in order always produces the same final state.

**Key differences:**
- No more custom broadcast messages — Autopass handles replication internally
- No more additive-only sync — Autopass correctly applies deletes from any peer
- **Offline edits work** — peers can add/remove while disconnected, and changes merge deterministically when they reconnect
- Invite codes are cryptographic keys (long z32 strings), not 4-digit numbers
- BlindPairing handles secure peer discovery and authentication

**New flow:**
1. Creator: `new Autopass(store)` → generates invite via `createInvite()`
2. Joiner: `Autopass.pair(store, invite)` → connects via BlindPairing → gets paired
3. Both: `pass.add(key, value)` / `pass.remove(key)` → `pass.on('update')` fires on all peers
4. Each `update` reads the full list via `pass.list()` and sends to UI via RPC

**Conflict resolution** (from our discussion):
- Every peer has their own Hypercore (append-only log)
- Events are `add(key, value)` or `remove(key)` 
- On replication, peers exchange all events from all writers
- Merge is deterministic: replay events in order (same on all peers)
- This fixes the stale-peer-desync problem completely

---

## Q: Why did we switch from Hyperbee to Autopass?

**The Problem:** With the original Hyperbee + Hyperswarm implementation, we had a critical sync bug:

```
1. User 1 and User 2 both have items [A, B, C]
2. User 2 disconnects (goes offline)
3. User 1 deletes item B → now has [A, C]
4. User 2 reconnects with stale local data [A, B, C]
5. Sync runs — B gets re-added because sync was "additive only"
6. Both users now have [A, B, C] — the deletion was lost!
```

The root cause: Hyperbee stores **current state** (key-value pairs), not **events**. When peer B reconnects with stale data, there's no record that "B was deleted" — only that "B exists in B's local store." The additive merge logic re-introduced deleted items.

**The Solution:** Autopass uses **Autobase** under the hood, which stores **events** (add/remove operations) in append-only Hypercores. Each peer has their own Hypercore, and Autobase merges all events deterministically. Since deletions are events too, they're never lost — replaying all events in order always produces the correct final state.

## Q: What are the key differences between Hyperbee and Autopass?

| Aspect | Hyperbee (before) | Autopass (after) |
|--------|------------------|------------------|
| **Data model** | Key-value store (current state) | Event log (append-only operations) |
| **Writers** | Single writer per Hypercore | Multi-writer via Autobase |
| **Sync** | Custom broadcast messages | Built-in replication |
| **Deletions** | Lost on stale peer reconnect | Preserved as events, always applied |
| **Offline edits** | Problematic (merge conflicts) | Works correctly (CRDT merge) |
| **Invite codes** | Custom 4-digit note codes | Cryptographic z32 strings (BlindPairing) |
| **Peer discovery** | Manual Hyperswarm topic join | BlindPairing handles authentication |

## Q: How does Autopass pairing work?

Autopass uses **BlindPairing** for secure peer discovery:

```
Creator (Device A):
  1. new Autopass(store) → creates new Autobase with unique key
  2. pass.createInvite() → generates one-time invite code (z32 string)
  3. Share invite code with Device B (copy/paste, QR, etc.)

Joiner (Device B):
  1. Autopass.pair(store, inviteCode) → connects via DHT
  2. BlindPairing handshake with Device A
  3. pair.finished() → returns paired Autopass instance
  4. Device B now has the base key and can write to the shared note

After pairing:
  - Both devices can do new Autopass(store) to reconnect
  - The base key is stored in the Corestore
  - No need for invite code again — just use the same storage path
```

**Important:** `pair.finished()` requires the **host to be online**. If Device A terminates its worklet (leaves the list), Device B cannot pair. The invite code is for initial pairing only, not for reconnection.

## Q: How do you rejoin a list after leaving?

This was one of our biggest challenges. The key insight:

**Autopass stores the base key in the Corestore.** If you use the same storage path, `new Autopass(store)` loads the existing base — no pairing needed!

```
Session 1 (Create):
  storagePath = /PearNote/abc123
  pass = new Autopass(store) → creates new base
  pass.key = 0x1234...  (stored in Corestore)

Session 2 (Rejoin):
  storagePath = /PearNote/abc123  ← SAME PATH!
  pass = new Autopass(store) → loads existing base
  pass.key = 0x1234...  (same as before)
  Items are still there!
```

**The mistake we made initially:** We used a unique timestamp-based storage path for EVERY session. This meant each session created a NEW Autobase instead of loading the existing one. The fix was to save the `storageId` (folder name) and reuse it when rejoining.

## Q: What are the three modes in the backend?

```javascript
// Args: [documentDirectory, mode, storageId?]

mode = 'create'
  // Create new note with unique storage path
  // storageId = timestamp (e.g., "mqham920")
  // Returns: storageId|invite

mode = 'join'  
  // Join someone else's note using their invite code
  // storageId = invite code from other device
  // Creates new storage path, pairs via BlindPairing
  // Returns: storageId|invite

mode = 'rejoin'
  // Rejoin a note you've been in before
  // storageId = folder name from history (e.g., "mqham920")
  // Uses SAME storage path → loads existing Autobase
  // Returns: storageId|invite
```

## Q: Why can't you join your own note with the invite code?

If you create a note, leave (terminate worklet), then try to JOIN with your own invite code — it fails with timeout.

**Why:** `Autopass.pair()` needs to complete a BlindPairing handshake with the HOST. When you leave, the host worklet is terminated. No host = no one to complete the handshake = `pair.finished()` times out.

**The fix:** Don't use `join` mode for your own lists. Use `rejoin` mode with the same storage path. The invite code is ONLY for other devices to join while you're hosting.

## Q: What challenges did we face implementing Autopass?

### Challenge 1: Storage path consistency
**Problem:** Using unique paths per session meant each session created a new Autobase.
**Solution:** Save `storageId` (folder name) to history, reuse it for rejoin.

### Challenge 2: `pass.add()` value must be a string
**Problem:** Passing arrays like `['item', title]` crashed with `uint must be positive`.
**Solution:** `JSON.stringify()` the value, `JSON.parse()` when reading.

### Challenge 3: Corestore file lock after crash
**Problem:** If the worklet crashed or was terminated abruptly, Corestore might leave locks.
**Solution:** Each note uses its own storage folder. If corrupted, delete and recreate.

### Challenge 4: `pair.finished()` hangs forever
**Problem:** No built-in timeout — if host is offline, it hangs.
**Solution:** Wrap with `Promise.race()` and a 30-second timeout.

### Challenge 5: `process.exit()` crashes the app
**Problem:** Calling `process.exit()` in the worklet crashed the React Native app.
**Solution:** Just call `pass.suspend()` and let the UI call `worklet.terminate()`.

### Challenge 6: Logs not appearing in logcat
**Problem:** Bare worklet's `console.log` didn't show in Android logcat with expected tags.
**Solution:** Forward logs via RPC to React Native, which logs with `ReactNativeJS` tag.

## Q: What's the final architecture?

```
┌─────────────────────────────────────────────────────────────┐
│                      React Native UI                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Create Note │  │ Join Note   │  │ Your Notes  │          │
│  │  (mode:     │  │  (mode:     │  │  (mode:     │          │
│  │   create)   │  │   join)     │  │   rejoin)   │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          │                                   │
│                    ┌─────▼─────┐                             │
│                    │  Worklet  │  (Bare runtime)             │
│                    │   + RPC   │                             │
│                    └─────┬─────┘                             │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                       Backend                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                      Autopass                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │ │
│  │  │  Autobase   │  │ BlindPairing│  │  Hyperswarm │      │ │
│  │  │ (multi-     │  │ (secure     │  │  (DHT peer  │      │ │
│  │  │  writer)    │  │  invites)   │  │  discovery) │      │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                           │                                   │
│  ┌────────────────────────▼────────────────────────────────┐ │
│  │                    Corestore                             │ │
│  │  /PearNote/abc123/  ← List 1 data                │ │
│  │  /PearNote/def456/  ← List 2 data                │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Data flow:**
1. UI calls `startWorklet(mode, storageId)` → starts Bare worklet
2. Worklet loads/creates Autopass with the storage path
3. Autopass joins DHT, finds peers, replicates data
4. On `pass.on('update')` → read `pass.list()` → send to UI via RPC
5. UI updates the list

**Key invariant:** Same `storageId` = same storage path = same Autobase = same note data.

---

## Q: Why doesn't pairing work on cellular (4G/5G)?

### The problem

BlindPairing requires a bidirectional DHT handshake between peers. Cellular networks (4G/5G) use **Carrier-Grade NAT (CGNAT)** which blocks inbound connections. The result:

- **WiFi + WiFi** → pairing works (both peers reachable via DHT)
- **WiFi + Cellular** → pairing fails for the cellular side (timeout after 30-90s)
- **Once paired**, switching to cellular works fine for reconnection

This is because `Autopass.pair()` (the initial handshake) needs *both* peers to be reachable via the DHT. CGNAT on cellular prevents the inbound half of the handshake. It's not a timeout issue — the connection never establishes at all.

### Why rejoin works on cellular

After the initial pairing, the base key is stored in Corestore. When rejoining, `new Autopass(store)` loads the existing base without needing a DHT handshake. Hyperswarm then connects via **outbound TCP** from the cellular side, which works fine because outbound connections traverse CGNAT without issues.

### Current behavior

| Scenario | Outcome |
|---|---|
| Both on WiFi | Works |
| Creator on WiFi, joiner on cellular (1st time) | Fails (pair timeout) |
| Creator on WiFi, joiner on cellular (rejoin) | Works |
| Both on cellular (1st time) | Fails |
| Both on cellular (rejoin) | Works |

### Workaround

Pair on WiFi first. After the initial pairing succeeds and the base key is stored in Corestore, switch back to cellular. Subsequent joins/rejoins will work.

### Possible fixes

1. **Relay server** — add a lightweight signaling server that relays the initial handshake. Both peers connect outbound to the relay, which forwards messages between them. This breaks pure P2P but enables cellular pairing.

2. **UDP holepunching** — some cellular carriers allow UDP holepunching even when TCP is blocked. Hyperswarm could use a UDP relay for the initial handshake, then upgrade to direct TCP.

3. **Retry with exponential backoff** — increase the timeout significantly (e.g., 3-5 minutes) and retry the pairing. Some CGNATs have temporary port mappings that expire quickly, so retries with different DHT entry points might work.

4. **Hybrid approach** — use a simple HTTP server as a bootstrap node. Both peers POST their public keys to the server, which forwards them to each other. Once they have each other's keys, they can attempt direct DHT connection.

---

## Q: How is backend.mjs used? Who calls those functions?

`backend.mjs` is a **Bare JavaScript module** — it runs in a separate JS engine (Bare), not in React Native. It is **not imported directly** by any React code. Instead:

1. `backend.mjs` is **bundled** into `app/app.bundle.mjs` via `bare-pack`:
   ```
   npx bare-pack --host android --linked --out app/app.bundle.mjs backend/backend.mjs
   ```
2. `app/hooks/useNote.ts` imports that bundle as a string:
   ```ts
   import bundle from '../app.bundle.mjs'
   ```
3. When the user taps "Create Note" or "Join Note", `startWorklet()` creates a new `Worklet` and passes the bundle to it:
   ```ts
   const worklet = new Worklet()
   worklet.start('/app.bundle', bundle, args)
   ```
4. The Worklet runs `backend.mjs` (plus all its Holepunch dependencies) in its own thread.

So `backend.mjs` is called by the Bare runtime when the Worklet starts. It's never called directly from React code.

## Q: What is `rpc.request(RPC_REMOVE)` in useNote.ts?

This is one of several **frontend→backend RPC calls**. The full set is defined in `backend.mjs`:

```js
const rpc = new RPC(IPC, (req, error) => {
  if (req.command === RPC_ADD)       → addItem(item)
  if (req.command === RPC_REMOVE)    → removeItem(key)
  if (req.command === RPC_CLEAR)     → clearAll()
  if (req.command === RPC_SET_NAME)  → setListName(name)
})
```

So `rpc.request(RPC_REMOVE).send(key)` in the frontend tells the backend to call `pass.remove(key)` in the Autopass store.

The full round trip for a remove:

1. **User taps ✕** → `handleRemoveItem(key)` in the hook
2. **Frontend sends** `rpc.request(RPC_REMOVE).send(key)` over IPC to the Worklet
3. **Backend receives** `RPC_REMOVE` → calls `removeItem(key)` → `pass.remove(key)`
4. **Autopass detects change** → fires `pass.on('update')` → calls `notifyUI()` → reads full list
5. **Backend pushes** `rpc.request(RPC_RESET).send(JSON.stringify(items))` back to frontend
6. **Frontend receives** `RPC_RESET` → `setItems(data)` → UI re-renders

The UI updates on step 6, not step 2. `handleRemoveItem` fires and forgets.

## Q: What are all the interactions between frontend and backend?

There are two sets of RPC commands — one for each direction:

**Frontend→Backend** (handled in `backend.mjs:26-43`):

| Command | What the backend does |
|---|---|
| `RPC_ADD` | `pass.add(key, JSON.stringify(item))` |
| `RPC_REMOVE` | `pass.remove(key)` |
| `RPC_CLEAR` | `pass.list()` + remove each key |
| `RPC_SET_NAME` | `pass.add('_note_name', JSON.stringify(['_name', name]))` |

**Backend→Frontend** (handled in `useNote.ts:128-181`):

| Command | What the frontend does |
|---|---|
| `RPC_MY_INVITE` | Shows invite code, saves to history, shows Alert |
| `RPC_RESET` | `setItems(data)` — replaces the full item list |
| `RPC_PEER_JOINED` | `setConnected(true)` — green dot on |
| `RPC_PEER_LEFT` | `setConnected(false)` — green dot off |
| `RPC_DIAG` | `console.log()` — diagnostic logging |
| `RPC_ERROR` | `Alert.alert()` — shows error to user |

## Q: Can you show an example of the backend calling the frontend?

`backend.mjs:104` — when a note is created or rejoined, the backend pushes the invite code:

```js
rpc.request(RPC_MY_INVITE).send(sessionId + '|' + invite)
```

The frontend catches it at `useNote.ts:128`:

```ts
if (req.command === RPC_MY_INVITE) {
  const data = b4a.toString(req.data)
  const [storageId, invite] = data.split('|')
  setMyCode(invite)
  Alert.alert('Note Created!', `Share this code:\n${invite}`)
}
```

Another example — `backend.mjs:151` when a peer connects:

```js
rpc.request(RPC_PEER_JOINED).send('connected')
```

Frontend turns the green dot on (`useNote.ts:164`):

```ts
if (req.command === RPC_PEER_JOINED) {
  setConnected(true)
}
```

And `backend.mjs:185` — after any data change, the backend pushes the full list:

```js
rpc.request(RPC_RESET).send(JSON.stringify(items))
```

Frontend replaces the item list (`useNote.ts:153`):

```ts
if (req.command === RPC_RESET) {
  setItems(data.filter((d: any) => d.key !== '_note_name'))
}
```

Same pattern every time: the backend calls `rpc.request(COMMAND).send(data)`, and the frontend has a matching `if (req.command === COMMAND)` handler.

## Q: What is `rpcInstance` on the frontend?

```ts
const rpcInstance = new RPC(IPC, (req) => {
  // 🔽 LISTENS for messages from the backend
  if (req.command === RPC_RESET) setItems(...)
  if (req.command === RPC_PEER_JOINED) setConnected(true)
})

// 🔼 SENDS messages to the backend
rpcInstance.request(RPC_SET_NAME).send(name)
```

`rpcInstance` is a single RPC object that does **both** listening and sending:
- The callback `(req) => { ... }` handles incoming messages from the backend
- `rpcInstance.request(COMMAND).send(data)` sends outgoing messages to the backend

It's saved as `rpc` state (`setRpc(rpcInstance)`) so other functions like `handleAddItem` and `handleRemoveItem` can use it to send commands later.

## Q: When is the RPC instance created? Is it always running?

Not on app open. The RPC instance is created **only when `startWorklet()` runs**, which happens when you tap "Create Note" or "Join Note". Before that, there's no backend at all — no Worklet, no RPC, no network connections.

Once started, both sides can initiate communication freely:

```
┌─ React Native thread ─────────────┐   ┌─ Bare Worklet thread ────────────┐
│                                    │   │                                  │
│  handleAddItem()                   │   │  init()                          │
│    rpc.request(RPC_ADD) ─────────IPC────>  addItem() → pass.add()         │
│                                    │   │                                  │
│                                    │   │  pass.on('update') → notifyUI() │
│  rpc callback fires  <───────IPC──────  rpc.request(RPC_RESET)            │
│    setItems(data)                  │   │                                  │
└────────────────────────────────────┘   └──────────────────────────────────┘
```

**Can it receive requests from the internet?** Yes, but through the Worklet, not through the frontend's RPC. The backend's `autopass` library uses Hyperswarm (P2P networking), so when another peer adds an item on their phone, `pass.on('update')` fires in the Worklet, which pushes the change to the frontend via `RPC_RESET`. The frontend never talks to the network directly — all P2P communication stays inside the Worklet thread.

## Q: What is the Worklet? Where does it run?

The Worklet is a **separate JavaScript engine** (`react-native-bare-kit`) that runs on a **different thread** inside your app process — it's not the main React Native JS thread, and not the native UI thread.

On your phone:

```
┌─────────────────────────────────────┐
│         App Process                 │
│                                     │
│  ┌─ UI Thread ──────────────┐       │
│  │  Native Android/iOS      │       │
│  │  (rendering, touches)    │       │
│  └──────────────────────────┘       │
│                                     │
│  ┌─ React Native JS Thread ───────┐ │
│  │  index.tsx → MenuScreen        │ │
│  │  Facebook's Hermes engine      │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌─ Bare Worklet Thread ──────────┐ │
│  │  backend.mjs                   │ │
│  │  Bare's JavaScript engine      │ │
│  │  - Corestore (local DB)        │ │
│  │  - Autopass (sync layer)       │ │
│  │  - Hyperswarm (networking)     │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Hyperswarm runs inside the Worklet thread** — it opens UDP/TCP sockets directly from there to other peers over the internet. The React Native thread never touches the network; it just sends/receives JSON messages over IPC to the Worklet.

The Worklet thread is a full Bare JavaScript runtime that runs `backend.mjs` plus all the Holepunch libraries (`autopass`, `corestore`, `hyperswarm`, `b4a`, `bare-rpc`, `bare-path`, etc.) as if it were a Node.js environment — but on your phone.

The React Native thread only imports the compiled bundle (`app.bundle.mjs`) as a string and hands it to the Worklet. It never runs those Holepunch libraries itself.

## Q: Is the backend like an API layer between the Holepunch libraries and the frontend?

Yes. The backend is the API gateway — it translates between two worlds:

| Frontend sends | Backend does | Holepunch library used |
|---|---|---|
| `RPC_ADD` | `pass.add(key, value)` | **autopass** (P2P key-value store) |
| `RPC_REMOVE` | `pass.remove(key)` | **autopass** |
| `RPC_CLEAR` | `pass.list()` + `pass.remove()` | **autopass** |
| `RPC_SET_NAME` | `pass.add('_note_name', ...)` | **autopass** |
| *(peer joined)* | `pass.swarm.on('connection')` | **hyperswarm** (P2P networking) |
| *(data changed)* | `pass.on('update')` → `notifyUI()` | **autopass** |
| *(invite code)* | `pass.createInvite()` | **autopass** |

The frontend never imports `autopass`, `corestore`, or `hyperswarm`. It only talks to `backend.mjs` over IPC. The backend is a thin adapter: the frontend sends high-level commands like "add this item", and the backend translates them into Holepunch operations, then pushes results back.

---

## Q: What is Corestore? What is the "file lock"?

Corestore is the **local database** on your phone's filesystem. Every note creates its own storage folder:

```
PearNote/mqham920/
├── corestore.db
├── corestore.wal
└── bits/
```

It stores:
- The **Autobase keys** (needed to rejoin a note without pairing again)
- The **Hypercore append-only logs** (all add/remove events)
- The **current data** (items you see in the list)

### What is the file lock?

When the Worklet opens a Corestore, it places a **lock file** in that folder — like an "occupied" sign on a bathroom. This prevents two processes from writing to the same database at the same time, which would corrupt the data.

When you **leave** a note normally (tap ‹ back button), `handleLeave()` calls `worklet.terminate()`, which kills the Worklet thread **instantly** — like pulling the power cord. The lock file stays on disk.

Next time you try to open that same note, Corestore sees the stale lock and refuses, thinking another process is still using it.

### What's the proper shutdown?

The AGENTS.md describes the correct sequence but it's never implemented:

```js
await pass.suspend()  // gracefully release Corestore lock
await goodbye.run()   // flush any pending writes
process.exit(0)       // then exit
```

Currently, `worklet.terminate()` skips this entirely — the lock is abandoned.

### Is the lock a real problem in practice?

In the current app, every session uses a **unique timestamp-based folder** (`PearNote/mqham920`, `PearNote/abc123`, etc.). So a stale lock in one folder doesn't affect a different session. The lock only matters if you try to **rejoin** the same note later — if the previous session left a stale lock, the rejoin could fail.

This is a known issue tracked in the AGENTS.md but not yet fixed. Each session creates a new folder, which avoids the lock problem but also means old session folders accumulate on disk.
