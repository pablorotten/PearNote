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

