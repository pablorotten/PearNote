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

---

## Note workflow (corrected)

### 0. Note creation

The actual init order in our code (`backend.mjs:84-105`):

```js
const sessionId = Date.now().toString(36)        // e.g. "mqs4hqur"
const storagePath = join(baseDir, 'pearnote', sessionId)
const store = new Corestore(storagePath)         // 1. Creates folder + initializes RocksDB
pass = new Autopass(store)                       // 2. Wraps store — internally creates Autobase + Hypercore(s)
await pass.ready()                               // 3. Opens Hypercore logs, starts Hyperswarm, generates key pair
const invite = await pass.createInvite()         // 4. BlindPairing invite for sharing
```

**Key corrections to the original draft:**

Public key = invite string | ❌ The invite is a BlindPairing token, not the public key |
The Hypercore's public/private key pair is stored **inside** RocksDB, not in the folder name or a separate file.


**Folder structure that results:**

```
pearnote/mqs4hqur/
├── CORESTORE           ← Corestore metadata (platform, inode, created timestamp)
└── db/                 ← RocksDB storage directory
    ├── 000009.sst      ← SST table (compacted data)
    ├── 000010.log      ← WAL (recent writes not yet flushed)
    ├── 000009.blob     ← blob file (larg
```

---

### 1. First entry ("Milk")

```
Our code:    pass.add('item:1718901234567', '["item","Milk"]')
                ↓
Autopass creates an Autobase entry pointing to the local writer's Hypercore
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

The root hash and its signature are stored alongside the entries in RocksDB. Individual entries are not separately signed — the Merkle tree lets you verify any entry against the signed root.

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
                   /                    \
Level 1:     [node0+1]            [node2+3]
             /        \           /        \
Level 0: [node0]    [node1]   [node2]    [node3]
         "Milk"    "Eggs"    "Bread"    "Butter"
```

The Merkle tree forms a balanced binary tree as entries are appended. The root hash is signed, and any leaf can be verified against it.

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

## Multi-writer scenario

Two peers, two Hypercores, one Autobase:

```
Peer A's Hypercore:   [Milk]  [Eggs]  [Bread]
Peer B's Hypercore:   [Butter]  [Cheese]
                          ↓
Autobase merges:      [Milk] [Eggs] [Butter] [Bread] [Cheese]  ← deterministic order via Autobase clock
                          ↓
pass.list() returns:  [Milk, Eggs, Butter, Bread, Cheese]
```

Corestore stores both Hypercores in the same RocksDB store. Autobase is the algorithm that interleaves them. Autopass gives us `pass.list()` which returns the merged result.