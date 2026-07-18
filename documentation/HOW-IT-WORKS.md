# Concepts

## Main Components

```
Our app code (JS/TS)
    ↕
Autopass     ← high-level API: pass.add(), pass.list(), pass.createInvite()
    ↕
Autobase     ← merges multiple Hypercores (one per writer) into one deterministic log
    ↕
Hypercore    ← single append-only log with Merkle tree + signing
    ↕
Corestore    ← bridge: manages Hypercores, maps them to RocksDB storage
    ↕
RocksDB      ← embedded key-value engine, persists bytes to .sst/.log files
```

## Layer-by-layer

| Layer | What it does | Do we write code for it? |
|---|---|---|
| **Autopass** | High-level API — `add()`, `list()`, `remove()`, `createInvite()`, `pair()` | ✅ Yes — this is what we call |
| **Autobase** | Merges multiple Hypercores (each peer has their own) into one ordered log | ❌ No — Autopass uses it internally |
| **Hypercore** | Append-only log + Merkle tree + key pair signing | ❌ No — Autopass/Autobase use it internally |
| **Corestore** | Creates/manages the on-disk storage for a collection of Hypercores | ✅ One line: `new Corestore(path)` — then passed to Autopass |
| **RocksDB** | Dumb key-value storage engine — writes bytes to `.sst`/`.log` files | ❌ No — Corestore talks to it internally |
| **Hyperswarm** | P2P networking layer — connects peers via DHT, replicates Hypercores | ❌ No — Autopass starts it internally |
| **Hyperbee** | Key-value index built on top of Autobase — lets you query the merged log | ❌ No — Autopass uses it internally |
| **BlindPairing** | Invite code system — lets a peer discover another peer via DHT | ❌ No — Autopass uses it internally |

---

## Note workflow (corrected)

### 0. Note creation

The actual init order in our code (`backend.mjs:84-105`):

```js
const sessionId = Date.now().toString(36)        // e.g. "mqs4hqur"
const storagePath = join(baseDir, 'pearnote', sessionId)
const store = new Corestore(storagePath)  // 1. Corestore creates folder + initializes storage engine
pass = new Autopass(store)                // 2. Autopass internally creates Autobase + Hypercore(s)
await pass.ready()                        // 3. Opens Hypercore logs, starts Hyperswarm, generates and stores key pair
const invite = await pass.createInvite()  // 4. Autopass generates a invite token via BlindPairing and stores it in Hypercore
```
---

### 1. First entry ("Milk")

```js
pass.add('item:1718901234567', '["item","Milk"]') // Autopass creates an Autobase entry pointing to the local writer's Hypercore
Key is the `Date.now()` timestamp `1718901234567`. Value is a JSON string of the entry data `["item","Milk"]`.
                ↓
Hypercore appends a node: { data: ..., seq: 0, merkle: ... }
    ├─ Updates Merkle tree (adds node0 as leaf)
    └─ Signs the new root (node0) with the local private key
                ↓
Corestore writes to RocksDB: <binary key> → <binary node + signature>
                ↓
RocksDB flushes to .log / .sst files
```

**Merkle tree after 1 entry:**
```
Level 0:    [node0]  ← signed root
            "Milk"
```

* The root hash and its signature are stored in RocksDB. 
* Individual entries are not separately signed.
* Merkle tree lets you verify any entry against the signed root.

---

### 2. Second entry ("Eggs")

```
pass.add('item:1718901234568', '["item","Eggs"]')
    ↓
Hypercore appends node1
    ├─ Updates Merkle tree (computes parent node0+1)
    └─ Signs the new root (node0+1) with the local private key
```

**Merkle tree:**
```
Level 1:        [node0+1]  ← signed root
                /       \
Level 0:    [node0]    [node1]
            "Milk"     "Eggs"
```

Nodes 0 and 1 are verified through the Merkle path to the signed root.

---

### 3. Third entry ("Bread")

```
pass.add('item:1718901234569', '["item","Bread"]')
    ↓
Hypercore appends node2
    ├─ Updates Merkle tree (node2 is an orphan root)
    └─ Signs the combined root (node0+1 + node2) with the local private key
```

**Merkle tree:**
```
Level 1:        [node0+1]          [node2]
                /       \
Level 0:    [node0]    [node1]    [node2]
            "Milk"     "Eggs"     "Bread"
```

Two roots exist: `node0+1` and `node2`. Hypercore signs a combined root of both.

---

### 4. Fourth entry ("Butter")

```
pass.add('item:1718901234570', '["item","Butter"]')
    ↓
Hypercore appends node3
    ├─ Updates Merkle tree (node2+3 built, then combined with node0+1)
    └─ Signs the new root (node0+1+2+3) with the local private key
```

**Merkle tree:**
```
Level 2:           [       root       ]  ← signed root
                   /                  \
Level 1:     [node0+1]            [node2+3]
             /        \           /        \
Level 0: [node0]    [node1]   [node2]    [node3]
         "Milk"    "Eggs"    "Bread"    "Butter"
```

The Merkle tree forms a balanced binary tree as entries are appended. The root hash is signed, and any leaf can be verified against it.

---

### 5. Another user joins the note

From **my point of view:**

```
I share the invite code (BlindPairing token) with Peer B.
Peer B enters the code on their phone.
                ↓
My Hyperswarm was already listening on the DHT (since step 0).
Peer B's BlindPairing finds me via the invite code.
                ↓
BlindPairing handshake completes on both sides.
                ↓
My Autopass adds Peer B as a writer via Autobase:
    this.addWriter({ key: peerBKey, name: null, readOnly: false })
                ↓
Hyperswarm starts replicating Peer B's Hypercore to my phone.
Now my Corestore stores BOTH Hypercores:

    My Corestore on disk:
    ├── Hypercore A (mine)
    │   └── [Milk] [Eggs] [Bread]
    └── Hypercore B (Peer B)  ← new, stored on MY phone
        └── (empty, Peer B hasn't added anything yet)
                ↓
Autobase reads both Hypercores and rebuilds the Hyperbee index
(persisted to disk via Corestore → RocksDB).
                ↓
pass.on('update') fires on my side.
notifyUI() sends the merged list to the frontend.
My screen still shows [Milk, Eggs, Bread] (nothing changed yet).
```

Key takeaway: **Peer B's Hypercore is now stored on my phone's disk.** I have a full local copy of their log, even if they haven't added anything yet. This is what makes offline and rejoin work — all data is local.

---

### 6. Another user adds an element

Peer B adds "Butter" to the list. From **my point of view:**

```
Peer B calls pass.add('item:ts', '["item","Butter"]')
    ↓ (on Peer B's phone)
Hyperswarm replicates Peer B's new Hypercore node to my phone.
    ↓
My Corestore stores the new entry in Peer B's Hypercore:

    My Corestore on disk:
    ├── Hypercore A (mine):   [Milk] [Eggs] [Bread]
    └── Hypercore B (Peer B): [Butter]  ← new, persisted on MY disk
    ↓
Autobase detects the new node in Peer B's Hypercore.
Runs _apply() which merges the entry into the Hyperbee index.
    ↓
The Hyperbee index (cached merged result) is now:
    { key: "item:123", value: ["item","Milk"] }
    { key: "item:456", value: ["item","Eggs"] }
    { key: "item:789", value: ["item","Bread"] }
    { key: "item:012", value: ["item","Butter"] }  ← new
    ↓
pass.on('update') fires
    ↓
notifyUI() → RPC_RESET → setItems() → screen re-renders
    ↓
I see: [Milk, Eggs, Bread, Butter]
```

I never fetched "Butter" from a server. It arrived via Hyperswarm replication of Peer B's Hypercore, was saved to my local RocksDB, and Autobase merged it into my view.

```
My perspective:
  My Hypercore:                [Milk] [Eggs] [Bread]
  Peer B's Hypercore (local):  [Butter]
                  ↓
  Autobase merges on my phone: [Milk] [Eggs] [Bread] [Butter]
                  ↓
  pass.list() returns:         [Milk, Eggs, Bread, Butter]
```

If I close the app, enable airplane mode, and reopen — I still see all 4 items. Because **both Hypercores are saved on my phone's disk**. Autobase reads them, rebuilds the Hyperbee index, and I'm back where I was.

--- 

### Summary of corrections to entry workflow

| Your original | Corrected |
|---|---|---|
| Each entry is signed individually | ❌ Only the current **root** is signed (root changes on every append) |
| "milk" hash is `hash1` | ❌ Hypercore hashes a node structure (data + metadata), not the raw string |
| Signature stored per-entry | ❌ Signature stored once for the root; Merkle path verifies any leaf |
| Entry format is human-readable | ❌ RocksDB keys/values are binary, not `hypercore::pubKey1::data::0` |

---

## Answers to questions

### 1. Is the described workflow correct?

**Mostly but with corrections** (see table above). The Merkle tree structure is correct; the signing model and folder naming are not.

### 2. Who manages what — Hypercore vs Autobase?

| Component | Manages |
|---|---|
| **Hypercore** | A single append-only log + Merkle tree + key pair + signing |
| **Autobase** | Multiple Hypercores (one per writer), merges them deterministically |
| **Autopass** | Autobase + BlindPairing + Hyperswarm, exposes `pass.add()` / `pass.list()` |

The workflow you described (Merkle tree, signing) is **Hypercore**. Autobase only orchestrates multiple Hypercores. Our app code only touches **Autopass**.

### 3. RocksDB is just a dumb storage engine?

**Yes.** RocksDB knows nothing about Hypercore, Merkle trees, or logs. It stores opaque byte key-value pairs. Corestore decides what keys/values to write. RocksDB just persists them.

### 4. When does Corestore come into play?

Corestore is the **bridge** between Hypercore and RocksDB:

```
Hypercore: "Store node at seq 5 for this core"
Corestore: "Write key=...data::5 value=<binary> to RocksDB"
RocksDB:   "Flushing to .sst"
```

In our code, Corestore is instantiated once (`new Corestore(path)`) and passed to Autopass. Everything else flows through it.

### 5. What is the invite string?

It is a **BlindPairing invite code** — NOT the Hypercore public key. It encodes enough info for another peer to discover and connect via the DHT. It's a z32-encoded string (letters + digits).

From `useNote.ts:146`:
```js
const [storageId, invite] = data.split('|')
// storageId = folder name (e.g. "mqs4hqur")
// invite = BlindPairing token (what the user shares)
```

### 6. When does Hyperswarm come in?

Hyperswarm starts **automatically** when Autopass initializes (`pass = new Autopass(store)`). The flow:

1. **Peer A creates note** → Hyperswarm joins a DHT topic (derived from note identity) and listens
2. **Peer A shares invite code** (BlindPairing string)
3. **Peer B enters invite** → `Autopass.pair(store, invite)` → BlindPairing resolves → both peers know each other's DHT addresses
4. **Hyperswarm connects them** → Hypercore replication starts automatically
5. Any `pass.add()` triggers `pass.on('update')` → `notifyUI()` → all peers see changes

We only touch Hyperswarm once in our code, to track connected peers for the green dot UI:
```js
pass.swarm.on('connection', (conn) => { /* track peers */ })
```

---

## RocksDB files explained

Everything in `db/` is pure RocksDB:

| File | Size | Purpose |
|---|---|---|
| `*.sst` | ~21 KB | SST tables — compacted key-value data (LSM tree) |
| `*.log` | ~28-79 KB | WAL (Write-Ahead Log) — recent writes not yet flushed to SST |
| `*.blob` | ~25 KB | Blob storage — large values stored separately from SST |
| `CURRENT` | 16 B | Points to the current MANIFEST file |
| `MANIFEST-*` | ~176-444 B | LSM tree metadata — tracks which SST files exist, column families |
| `IDENTITY` | 36 B | Unique RocksDB instance UUID |
| `LOCK` | 0 B | Prevents two processes from opening the same store |
| `LOG` / `LOG.old` | ~48-56 KB | RocksDB internal debug log (compactions, flushes) |
| `OPTIONS-*` | ~12 KB | RocksDB configuration options |
| `SESSION_ID` | 20 B | Session identifier for this RocksDB runtime |

## Complete data flow summary

```
User taps "Create Note"
    ↓
useNote.ts: startWorklet('create')
    ↓ (bare-rpc IPC)
backend.mjs: new Corestore(path) + new Autopass(store)
    ↓
Corestore creates folder + initializes RocksDB
    ↓
Autopass internally creates Autobase → Hypercore(s) → key pair generated
    ↓
Autopass starts Hyperswarm (listening for connections)
    ↓
pass.createInvite() → BlindPairing invite code
    ↓ (RPC back to UI)
User shares invite code (text / QR)

User adds "Milk"
    ↓
pass.add('item:ts', '["item","Milk"]')
    ↓
Autopass → Autobase → local Hypercore fork appends node
    ↓
Corestore writes node to RocksDB
    ↓
Hyperswarm broadcasts to connected peers
    ↓
Remote peer's Autopass receives update → merges via Autobase
    ↓
pass.on('update') → notifyUI() → RPC_RESET → setItems() → screen re-renders
```

## Multi-writer scenario summary

Two peers, two Hypercores, one Autobase — all on **my phone's disk**:

```
My phone's Corestore (local disk):
├── Hypercore A (mine):   [add Milk] [add Eggs] [add Bread]
└── Hypercore B (Peer B): [add Butter] [add Cheese]
                            ↓
Autobase reads both, merges deterministically via logical clock
                            ↓
Autopass reads Hyperbee index → pass.list() → ["Milk", "Eggs", "Butter", "Bread", "Cheese"]
```

No network needed to see the merged result. Everything is local.


