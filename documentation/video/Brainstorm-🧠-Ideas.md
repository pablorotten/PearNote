| Component | Analogy for server-side devs |
| --- | --- |
| Hypercore | "Like a .log file or a database table that only supports INSERT, never UPDATE or DELETE — and it replicates itself P2P like a torrent" |
| Corestore | "Like a DataSource / connection pool — you configure it once with a folder and a master key, then your app asks it for individual Hypercores without managing them manually" |
| Bare | "Node.js running on your phone instead of a server" |
| Autopass | "Like a shared Google Keep with no server — any device with an invite code joins, edits sync automatically, and conflicts resolve themselves" |

The Hypercore one I'd keep your instinct: start with "it's our database" for the non-technical crowd, then immediately caveat "but think .log file, not SQL — append-only, no edits, no deletes."

---

## Most interesting component

Hypercore is the most impressive to me. It's deceptively simple — an append-only log — but the Merkle tree design gives it superpowers:
- Sparse sync: verify one entry without downloading the entire log. On mobile, this is huge — you don't download 10 years of history to see today's note.
- Cryptographic identity: the public key is the log. You can verify every entry against the first root hash.
- Replication protocol: two peers can figure out exactly which nodes the other is missing and sync only those.
Everything else (Autobase, Autopass, Hyperbee) is built on top of this single primitive. It's the foundation that makes the entire stack work.
Autobase is a close second — solving multi-writer CRDT merge deterministically is a genuinely hard problem, and Autobase's approach (logical clocks + append-only forks) is elegant.


### Claude opinion:

Autobase is solving a problem that has been an open research problem in distributed systems for decades: how do you get multiple independent writers to agree on a consistent order of events, with no central coordinator, including across offline periods?
What makes it genuinely impressive:
- It implements a causal DAG linearization algorithm that converges deterministically across all peers
- The ordering can rewind and replay as new causal information arrives — existing entries get reordered on the fly without corrupting state
- It uses a quorum-based checkpointing system so peers that are far behind can fast-forward without replaying the entire history
- All of this happens with zero servers and zero coordination messages beyond the data itself
Hypercore is the foundation. Autobase is the hard part. Autopass is just Autobase with a nice API on top.
If you want a line for the video: "Hypercore stores the data. Autobase is the PhD dissertation that makes multi-peer sync actually work."

---

## Privacy & Chat Control (for the video pitch)

### The problem: Cloud notes are not private

| App | What it does |
| --- | --- |
| Google Keep | Scans your notes server-side (cloud analysis, CSAM detection, govt reporting) |
| Microsoft OneNote | Same — OneDrive cloud scanning |
| Apple Notes | Uses NeuralHash on-device, plus iCloud server-side scanning; reports to NCMEC |
| Samsung Notes | Syncs through Samsung Cloud / OneDrive — all server-side scanning applies |

These apps already flag content and report to authorities (NCMEC, national hotlines). If you keep notes **offline only**, they aren't scanned. But the moment you sync to cloud, they are.

### What Chat Control 1.0 / 2.0 would add

| | Current (server-side) | Chat Control (would add) |
| --- | --- | --- |
| Where scanning happens | In the cloud after upload | **On the device** before encryption (client-side scanning) |
| What it targets | Cloud-synced content | All content, including E2EE apps (Signal, WhatsApp) |
| Impact on encryption | None — scanning after encryption | **Breaks E2EE** — scanning must happen before encryption |
| Status | Already deployed by Apple/Google/Microsoft | Proposed EU law, not yet passed (controversial) |

Chat Control would mandate **client-side scanning**: apps must scan messages, photos, notes **on your device** before they're encrypted and sent. This makes E2EE impossible by design.

### Where PearNote fits

**What PearNote does right (vs. cloud apps):**
- No central server — data never touches Google, Microsoft, or Apple infrastructure
- P2P sync over Hyperswarm (encrypted connections directly between devices)
- BlindPairing invites (cryptographic, not guessable — z32 strings, not 4-digit codes)
- Local storage on device filesystem only (Corestore / RocksDB on disk)

**Where it could still be affected:**
1. **App store distribution** — if Chat Control becomes law, Apple/Google could be forced to remove apps that don't implement client-side scanning. PearNote would be blocked from distribution unless it adds scanning code.
2. **OS-level scanning** — Android/iOS could implement mandatory scanning at the OS layer, out of the app's control entirely.
3. **Local data not encrypted at rest** — Corestore data on the filesystem is not encrypted currently. Anyone with physical access to the phone could read it.

### How to make it 100% private (future work)

1. **Encrypt Corestore at rest** — add a passphrase-derived key so local data is encrypted (like Signal's local database encryption)
2. **Sideload distribution only** — skip app stores entirely (APK on GitHub / website)
3. **De-googled OS** — run on GrapheneOS / CalyxOS to avoid OS-level surveillance

### Why PearNote is a good video demo for this

The contrast is the hook: cloud notes apps *look* private but are scanning your data server-side (and soon client-side). PearNote shows what actual P2P privacy looks like — **no servers to scan, no cloud to report, no company to subpoena**. The data literally never leaves your devices unless you choose to share it (and even then, it's direct P2P, not through a middleman).

### Multi-peer sync

This is where Autobase earns its place.

**With 1 peer — trivial:**

```
Peer A Hypercore: [PUT milk] [PUT bread] [DEL milk]
Result: { bread }
```

**With 3 peers — the problem:**

Each peer writes to their **own** Hypercore. Nobody shares a log. So when they go offline and edit simultaneously you get:

```
Peer A Hypercore: [PUT milk] [PUT bread]
Peer B Hypercore: [PUT eggs] [DEL bread]  ← doesn't know A added bread yet
Peer C Hypercore: [PUT butter]
```

When they reconnect, Corestore downloads all three logs locally. Now every device has 3 Hypercores. Who wins? What's the correct order?

This is the classic distributed systems problem — and it's exactly what Autobase solves.

**How Autobase solves it:**

Each entry doesn't just store the value — it stores causal references to what the writer had already seen when they wrote it. Like a Git commit that references its parent commits.

```
Peer A: [PUT milk] [PUT bread, refs: milk]
Peer B: [PUT eggs] [DEL bread, refs: eggs]  ← B hadn't seen A's bread yet
Peer C: [PUT butter, refs: milk]
```

Autobase builds a DAG (Directed Acyclic Graph) from those references, linearizes it into a deterministic order that every peer computes independently, then replays all entries to rebuild the current state.

**The key guarantee: every peer runs the same algorithm on the same logs → every peer gets the same result.**

**The offline scenario with 3 peers:**

```
← offline editing →            ← reconnect →

Peer A: [PUT milk, PUT bread]  ──┐
Peer B: [PUT eggs, DEL bread]  ──┤→ Autobase linearizes → same view on all 3
Peer C: [PUT butter]           ──┘
```

Yes — all 3 phones will show the same note. Not because a server decided the truth, but because all three independently run the same deterministic algorithm on the same set of logs and arrive at the same answer.

> [!NOTE] Animation of 3 phones going offline, editing independently, then reconnecting and converging to the same state

**Offline delete example:**

Peer A and Peer B are both online and have the same note: `{ milk, bread, eggs }`. Both go offline.

```
Online state (both peers):  { milk, bread, eggs }

← go offline →

Peer A (offline): DEL bread
  Peer A Hypercore: [..., DEL bread]
  Peer A sees:  { milk, eggs }

Peer B (offline): DEL eggs, PUT butter
  Peer B Hypercore: [..., DEL eggs, PUT butter]
  Peer B sees:  { milk, bread, butter }

← reconnect →

Autobase on both devices:
  replays all logs in the same deterministic order
  Result: { milk, butter }   ← same on both phones
```

Bread is gone (A deleted it). Eggs are gone (B deleted it). Butter is there (B added it). No server needed to decide — both phones computed the same answer independently.

**One honest caveat:**

Autobase doesn't have semantic conflict resolution. If Peer B deletes bread without knowing Peer A just added it, the algorithm picks a deterministic winner — but it won't ask "hey, A added this and B deleted it, what do you want to do?" It just converges. For a note app that's fine. For a bank account it wouldn't be.

---

# Topics NOT covered in the video script

Everything below is material that came up during development and research but didn't make it into the video.

---

## Bare: why it exists

The video mentions Bare but doesn't answer the obvious question a developer asks: "Why not use Node.js?"

| Option | Problem |
|---|---|
| **Node.js** | Can't run on Android/iOS natively |
| **Node.js Mobile** | Abandoned project; shipped a 50MB+ binary |
| **React Native's JS thread** | Tied to UI lifecycle — blocks rendering if you run persistent networking on it |
| **Hermes** (React Native's engine) | Optimized for rendering speed, not I/O or native addons |
| **JavaScriptCore / V8 standalone** | Just engines — no OS integration (no filesystem, sockets, threads) |

Bare was purpose-built for exactly what the Holepunch stack needs:
1. Run C++ native addons (Hypercore, Corestore, Hyperswarm are all native C++)
2. Raw sockets and threading for P2P networking (DHT, TCP, UDP)
3. Embeddable inside another app (React Native) via `react-native-bare-kit`
4. First-class Worklet support — isolated thread with built-in IPC (`bare-rpc`)
5. Small footprint — only the I/O primitives the Holepunch stack needs

Without Bare, PearNote couldn't run on a phone at all.

### The thread architecture (what the video skips)

The video says "Bare runs the backend on your phone" but doesn't show HOW. Inside the app process there are three threads:

```
┌─────────────────────────────────────────┐
│              App Process                │
│                                         │
│  ┌─ UI Thread ────────────────────┐     │
│  │  Native Android/iOS rendering  │     │
│  └────────────────────────────────┘     │
│                                         │
│  ┌─ React Native JS Thread ───────┐     │
│  │  React UI (Hermes engine)      │     │
│  └────────────────────────────────┘     │
│                                         │
│  ┌─ Bare Worklet Thread ──────────┐     │
│  │  backend.mjs                   │     │
│  │  Corestore (local DB)          │     │
│  │  Autopass (sync layer)         │     │
│  │  Hyperswarm (networking)       │     │
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

The React Native thread and the Bare thread communicate via `bare-rpc` IPC — the same concept as HTTP, but in-process. Instead of `fetch('https://api.example.com/notes/add')`, you call `rpc.request(RPC_ADD).send(...)`.

**The "server on your phone" reframe:**

In client-server:
```
Phone (UI) ──network──► Server (logic + storage)
```

In PearNote:
```
React Native thread (UI) ←──IPC──► Bare thread (logic + storage)
```

The Bare worklet is the server. It just runs on the same device instead of a data center. This is the real meaning of "no server" — the server logic moved to each peer's phone.

---

## BlindPairing: how the invite code actually works

The video shows the QR code but doesn't explain what's inside it or how two strangers find each other.

**The invite code is NOT the public key.** It's a BlindPairing token — a z32-encoded string that packages:
- A **topic** (discovery key) to find the host via DHT
- **Cryptographic material** for a secure handshake (so only the holder of the token can join)

"Blind" means the token doesn't reveal the Autobase key or any note content to eavesdroppers — even to DHT nodes that route the handshake.

### The conversation in plain terms

```
Joiner: "I have invite code abc123. I want to join."
         → sends invite hash through the DHT

Host:   "Let me check... that invite exists in my local store."
         → reads joiner's identity from the handshake
         → adds joiner as an authorized writer
         → sends back: the Autobase key + the encryption key

Joiner: "Got it. Now I can open the note."
         → creates Autopass with the real keys
         → Hypercore replication starts automatically
```

After this one-time handshake, no invite code is needed again. Both phones store the Autobase key locally (in Corestore/RocksDB) and reconnect autonomously via Hyperswarm on future sessions.

### Security model (three layers)

```
Find the phone    → need topic (discovery key)
Open a connection → need IP (from DHT)
Read the data     → need encryption key (from BlindPairing invite)
```

An attacker can see DHT traffic and even connect to your phone — but they receive end-to-end encrypted data they can't read. Same model as HTTPS: address is visible, content is not.

### Why pairing fails on cellular (4G/5G)

The initial BlindPairing handshake requires both phones to be **reachable via the DHT**. On 4G, phones are behind carrier-grade NAT (CGNAT) — they can make outbound connections but the DHT cannot route inbound handshake messages back to them.

| Scenario | Result |
|---|---|
| Both on WiFi | Works |
| Creator on WiFi, joiner on 4G (1st time) | Fails (pair timeout) |
| Both on 4G (1st time) | Fails |
| Any combination (rejoin) | Works |

After the initial pairing, the base key is stored locally. Reconnecting works on cellular because it only requires outbound TCP — no DHT handshake needed.

Fix: configure a relay server via `relayThrough` option in Autopass.

---

## Hyperswarm networking: hole-punching and relays

The video explains the DHT (phonebook) but not what happens *after* two peers find each other. Getting a direct connection between two phones behind NAT is non-trivial.

### UDP hole-punching (the clever trick)

NAT routers block unexpected inbound packets but allow outbound-initiated traffic. The trick: both phones initiate outbound connections to each other simultaneously.

1. A sends a UDP packet to B's IP:port (NAT creates a "hole" in A's table)
2. B sends a UDP packet to A's IP:port (NAT creates a "hole" in B's table)
3. Both holes are open at the same moment → the packets slide through

Works ~80% of the time. The remaining ~20% (symmetric NATs, carrier-grade NAT) need a relay.

### Relay fallback

When hole-punching fails, Hyperswarm falls back to a relay (a server with a public IP both phones can reach as clients):

```
A → Relay ← B
```

A connects to the relay as a client. B connects to the relay as a client. The relay forwards encrypted bytes between them. The data is end-to-end encrypted (Noise protocol), so the relay is just a pipe — it can't read anything.

This is the one case where a server is involved — but it's a dumb byte-forwarding relay, not a database or business logic server. And the data is encrypted end-to-end so the relay operator learns nothing.

### IPv6 eliminates NAT entirely

With IPv6, every device has a globally unique public address. No NAT, no hole-punching needed. Direct P2P works cleanly. As IPv6 adoption grows, Hyperswarm's networking becomes simpler.

---

## DHT: nodes vs peers, and the shared global phonebook

The video explains the DHT as a "phonebook" but conflates two concepts developers ask about.

### Nodes vs Peers

| | Node | Peer |
|---|---|---|
| What | Any device participating in the DHT mesh | Anyone sharing the same note |
| Role | Stores a piece of the routing table, routes queries | Exchanges Hypercore blocks for a specific topic |
| Scope | Global (app-agnostic) | Note-scoped |

Your phone is both: a **node** that holds routing table entries for many topics, and a **peer** for the specific notes you've joined.

**Bootstrap nodes** are always-on devices with hardcoded addresses in the Hyperswarm library. Their only job: welcome new phones and introduce them to nearby DHT nodes. After that, your phone is self-sufficient.

### Every Holepunch app shares the same DHT

Keet (Holepunch's video call app), PearNote, and any app built on Hyperswarm all share the **same global DHT**. Topics from different apps are mixed in the same distributed table. But only peers who know a topic hash can find each other, so apps are isolated in practice.

### Topic vs identity keypair (commonly confused)

| | Identity | Topic |
|---|---|---|
| What | Your phone's keypair (stored in Corestore) | A note's discovery key |
| Purpose | Who you are on the DHT | What note you're interested in |
| Scope | Persistent per device | Tied to one specific note |
| Analogy | Your passport | A hashtag like `#Groceries` |

One phone can be interested in multiple topics (one per note), but has only one identity keypair.

---

## Hypercore vs Blockchain: the comparison people will make

Hypercore uses two concepts from blockchain — append-only logs and Merkle trees — but is fundamentally different.

| | Hypercore | Blockchain |
|---|---|---|
| Writers | One (private key owner) | Many (unknown parties) |
| Trust model | Cryptographic signature | Consensus algorithm (PoW/PoS) |
| Consensus | Not needed | Required (Byzantine fault tolerance) |
| Use case | Personal or shared log (trusted writers) | Permissionless ledger (untrusted writers) |

Hypercore docs describe it as "like a lightweight blockchain without the consensus algorithm." That's accurate — it's the same data structure but missing the one thing that makes blockchain expensive: agreeing between untrusted strangers.

**You cannot build a cryptocurrency with Hypercore.** There's no mechanism to prevent double-spending. The Byzantine Generals Problem doesn't apply because access is invite-only — participation is permissioned, writers are trusted at pairing time.

**Quote for the video**: "Hypercore is like a blockchain that trusts you — because you invited everyone who can write to it."

### Comparison with similar P2P tools

| Tool | How it differs from Hypercore |
|---|---|
| **Secure Scuttlebutt (SSB)** | Same append-only log concept but NO sparse replication — you must download the full log. Hypercore can sync just the blocks you need, like BitTorrent. |
| **OrbitDB** | Append-only log built on IPFS instead of Hypercore's protocol |
| **Gun.js** | Real-time P2P sync graph database |

---

## Corestore and RocksDB: the actual storage layer

The video doesn't mention Corestore at all. It's the bridge between Hypercore's logical model and bytes on disk.

```
pass.add(key, value)    ← Autopass (what you call)
  → base.append(...)    ← Autobase (event log)
    → hypercore.append() ← Hypercore (logical log)
      → corestore.write() ← Corestore (bridge API)
        → rocksdb.put()   ← RocksDB (actual bytes)
```

**Corestore** is like a DataSource/connection pool: configure it once with a folder path, and it manages all the Hypercores for that note. RocksDB is its current storage engine — it could be swapped for SQLite or LevelDB without changing anything above it.

**The important framing**: you store data in Hypercore/Autobase conceptually. The bytes happen to land in RocksDB. Never say "I store in RocksDB" — that's like saying "I store in the hard drive sectors." The abstraction layer matters.

### What's actually on disk (from a real device extraction)

```
pearnote/mqs4hqur/          ← session folder (Date.now().toString(36))
├── CORESTORE               ← metadata: platform=android, inode, created timestamp
└── db/                     ← RocksDB data
    ├── 000014.sst           ← Sorted String Table: actual key-value data (21KB)
    ├── 000009.blob          ← Blob file: large values stored separately (24KB)
    ├── 000010.log           ← Write-Ahead Log: recent uncompacted writes (28KB)
    ├── MANIFEST-000011      ← LSM tree metadata: which SST files exist
    ├── IDENTITY             ← Unique RocksDB instance UUID (36B)
    └── LOCK                 ← Prevents two processes opening the same store (0B)
```

Each note session gets its own folder with a base-36 timestamp as the name. The public key lives inside RocksDB — not in the folder name.

**The LOCK file problem**: when a worklet is killed abruptly (user leaves the note), the LOCK file stays on disk. Next rejoin, Corestore sees the stale lock and may refuse to open. Proper shutdown requires `await pass.suspend()` before `worklet.terminate()`.

---

## Autopass: the full picture (porcelain analogy)

The video mentions Autopass briefly in the conclusion but doesn't explain what it actually is.

Git has **plumbing** (`git hash-object`, `git update-ref`) and **porcelain** (`git commit`, `git merge`). Autopass is the **porcelain** of the Holepunch stack.

Two lines of code silently start:
1. A local database (Autobase + HyperDB view + Corestore + RocksDB)
2. A DHT swarm (Hyperswarm + topic announcement)
3. A cryptographic pairing server (BlindPairing listener)
4. A replication protocol (Hypercore block exchange)

```js
const store = new Corestore(storagePath)  // configure storage
const pass = new Autopass(store)          // everything else starts here
await pass.ready()                        // wait for swarm + DB to be ready
```

After `pass.ready()`, `pass.add()`, `pass.remove()`, and `pass.list()` replace what in a server-side app would be REST API calls to a backend + database + pub/sub notification system.

### The Hyperbee view: derived data, not source of truth

Autopass maintains a Hyperbee (key-value index on top of Hypercore) as a **materialized view** of the merged state. It's a performance cache — if you deleted it, Autobase could replay all Hypercore logs from scratch and reconstruct the identical state.

The Hypercores (one per writer) are the actual source of truth. The view is disposable.

**Analogy**: Hypercore is the database WAL (write-ahead log). The Hyperbee view is the indexed table state Postgres builds by replaying the WAL.

### Official Holepunch taxonomy

```
Hyperswarm = P2P Networking
Hypercore  = P2P Data Streams
Hyperdrive = P2P File System
Hyperbee   = P2P Database
Autobase   = P2P Collaboration
Autopass   = P2P Porcelain (wraps all of the above)
```

---

## Pear: the bigger picture

The video outro mentions "give Pear a try" but doesn't explain what it is or how it relates to what was just shown.

**Pear is to Holepunch what Electron is to Node.js.**

- Electron takes Node.js (backend) + Chromium (frontend) and packages them into a desktop app runtime.
- Pear takes the Holepunch stack (backend) + a web renderer (frontend) and packages them into a P2P app runtime.

PearNote **does not use Pear**. It uses the raw Holepunch stack directly via `react-native-bare-kit`. Pear is a desktop-only platform — it cannot run on Android or iOS.

The mobile path is: `Expo/React Native` (UI) + `react-native-bare-kit` (Bare worklet) + `autopass`/`corestore`/`hyperswarm` — which is exactly what PearNote does.

**DevRel note**: discovering that Pear is desktop-only only after starting to build a mobile app is a real friction point. The Holepunch website and docs don't surface this distinction clearly upfront. A better first page might say: "Building for desktop? Use Pear. Building for mobile? Use the stack directly with react-native-bare-kit."

---

## Development war stories (real bugs from building this)

These didn't make the video but are gold for a devrel blog post or a "building with Holepunch" talk.

### The guest misses the connection event

The guest phone showed "SWARM connection event FIRED" in logs but never "Connection established." One-way sync: host saw the guest, guest didn't see the host.

Root cause: the `swarm.on('connection')` handler was registered **after** `await discovery.flushed()`. On the guest, Hyperswarm discovers the host during DHT lookup and the `connection` event fires **before** `flushed()` resolves — before the handler was registered. Event already gone.

Fix: register the handler **before** calling `swarm.join()`.

### `swarm.peers` is a Map, not an array

`swarm.peers.length` returns `undefined`. Accessing `.length` on a Map silently fails — no error, just a missing peer in the tracking Set and broadcast to 0 peers. Fix: use `peers.size` with your own Set.

### `process is not defined` — Bare runtime crash

After a dependency update, the backend worklet crashed on startup: `Uncaught ReferenceError: process is not defined`. Bare does not provide a `process` global like Node.js. A transitive dependency (somewhere in the Corestore chain) references `process` at the top level without a `typeof` guard.

Fix: add `import process from 'bare-process'` + `globalThis.process = process` at the very top of `backend.mjs`, before all other imports.

### `pair.finished()` hangs forever

If the host leaves before the joiner finishes pairing, `pair.finished()` never resolves — no timeout, no error, just silence. Fix: wrap in `Promise.race()` with a 30-second timeout.

### `pass.add()` value must be a string

Passing `['item', title]` (an array) crashed with `uint must be positive` — an error from the binary encoding layer, not a helpful type error. Fix: `JSON.stringify()` on write, `JSON.parse()` on read.

### `process.exit()` crashes the app

Calling `process.exit(0)` in the Bare worklet kills the entire React Native process — not just the worklet thread. Fix: call `pass.suspend()` and let the UI call `worklet.terminate()`.

### Each session creates a new folder (accumulating disk usage)

Every `create` or `join` generates a new `Date.now().toString(36)` folder. If the user opens and closes many notes over months, they accumulate forever. There's no cleanup mechanism. Fine for a demo app; a production app would need a pruning strategy.

