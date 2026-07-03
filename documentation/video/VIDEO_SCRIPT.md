# PearNote: P2P Note Sync with Holepunch

**Video Script — ~5-7 min**

---

## Hook (0:00 - 0:20)

**[Screen: Two phones side by side, one typing "Milk", item appears on both]**

> No server. No cloud. No database. Two phones, and a shared list that just works — even if one goes offline. This is PearNote, and it's built entirely on the Holepunch stack. Let me show you how it works — and why it matters.

---

## 1. The Problem (0:20 - 0:45)

**[Screen: Talking head or title card]**

> Every shared note app today depends on a server. Google Keep, Apple Notes, Notion — they all route your data through someone else's computer. That means accounts, subscriptions, downtime, and trust. What if two phones could just... talk to each other?

---

## 2. The Demo (0:45 - 2:30)

**[Screen: Screen recording of the app]**

### Step 1 — Create a note

> I open PearNote, tap "Create Note", give it a name — "Groceries" — and hit Create.

**[Show the invite code alert]**

> I get a cryptographic invite code. This isn't a room ID or a password — it's a one-time key that proves who I am to the other device.

### Step 2 — Share via QR

> I tap "Show QR", and the other phone scans it. No account creation. No sign-up flow.

**[Show the connection indicator turning green]**

> And just like that — connected. The dot turns green. Both phones are now peers on the same shared list.

### Step 3 — Add items

> I add "Milk" on Phone A — it appears on Phone B. I add "Bread" on Phone B — it appears on Phone A.

### Step 4 — Go offline and back

> Now watch this. I turn off WiFi on Phone A, add "Eggs". Phone B can't see it yet. I reconnect — and "Eggs" appears. No conflict. No merge error. It just works.

**[Beat]**

> That's the CRDT doing its job. Every edit is an event. The log is append-only. Replaying the events in any order produces the same result.

---

## 3. The Stack (2:30 - 4:00)

**[Screen: Architecture diagram or animated stack graphic]**

> So what's under the hood? Four libraries from Holepunch, layered on top of each other.

**[Animate stack bottom-up]**

### Corestore

> **Corestore** — persistent Hypercore storage on the phone's filesystem. Think of it as your local database, but designed for P2P replication.

### Hyperswarm

> **Hyperswarm** — the networking layer. It uses a Distributed Hash Table to find peers across the internet. No central relay. No STUN server. Just peers finding each other through the DHT.

### BlindPairing

> **BlindPairing** — the handshake. When you scan that QR code, BlindPairing does a cryptographic key exchange over Hyperswarm. The invite code is a one-time z32 string. Once paired, both devices know each other's public keys.

### Autobase

> **Autobase** — the sync engine. This is the magic. It's a multi-writer append-only Hypercore. Each peer writes their own log of events. Autobase merges all logs deterministically using a CRDT. Add an item? That's an event. Remove an item? Also an event. The final state is always the same, no matter what order the logs arrive.

### Autopass

> **Autopass** — ties it all together. It wraps Autobase + BlindPairing into a simple key-value API. Three calls: `add`, `remove`, `list`. That's it.

---

## 4. How the App Works (4:00 - 5:15)

**[Screen: Code snippets or architecture diagram]**

> The app itself is React Native on Expo, but the P2P logic doesn't run in the React thread. It runs in a **Bare worklet** — a separate JS engine thread.

**[Show the thread diagram: UI → IPC → Worklet → Autopass]**

> React Native handles the UI. The worklet handles all P2P operations. They talk over **bare-rpc** — bidirectional IPC. The UI sends commands like "add item" or "remove item". The worklet sends back the full list every time it changes.

> This separation matters. The P2P stack is doing networking, crypto, and disk I/O. You don't want that blocking your UI thread.

**[Show backend code snippet]**

> The backend is about 250 lines. It starts Corestore, initializes Autopass, joins Hyperswarm, and listens for RPC messages. When a peer connects, it fires an update event. On every update, it reads the full list from Autopass and pushes it to the UI.

**[Show the three modes: create, join, rejoin]**

> Three modes: **Create** — start a new note, get an invite. **Join** — paste an invite, pair with the creator. **Rejoin** — load a note you already have on disk, generate a fresh invite for new sessions.

---

## 5. Why It Matters (5:15 - 6:00)

**[Screen: Talking head or title card]**

> This isn't just a demo. It's a blueprint for a new kind of app.

> No accounts. No servers. No subscription fees. Your data lives on your device, and it syncs directly to the devices you choose. If Holepunch's servers go down — it doesn't matter. Your app still works.

> And the developer experience is surprisingly simple. Autopass gives you a key-value store. You don't need to think about conflict resolution, last-write-wins, or operational transforms. The CRDT handles it.

> For developers building the next generation of collaborative tools — whether it's shared documents, project boards, or messaging — this is the stack to bet on.

---

## CTA / Close (6:00 - 6:30)

**[Screen: PearNote logo + Holepunch/Tether branding]**

> PearNote is open source. Links in the description. If you're building something with Holepunch, I'd love to hear about it.

> Thanks for watching.

**[End card: social links, subscribe, etc.]**

---

## Visual Notes for Editing

| Timestamp | Visual | Notes |
|-----------|--------|-------|
| 0:00 | Two phones side by side | Real-time sync moment — hook the viewer |
| 0:45 | Screen recording | Smooth walkthrough, show connection indicator |
| 2:30 | Animated stack diagram | Build the stack bottom-up as you narrate |
| 4:00 | Architecture diagram | 3 threads: UI, React Native JS, Bare Worklet |
| 5:15 | Talking head or title cards | Emotional payoff — why this matters |
| 6:00 | Logo + CTA | Clean close |

## Suggested B-Roll

- Hyperswarm DHT visualization (animated network graph)
- Autobase append-only log (animated timeline of events)
- QR code scanning moment (slow-mo or freeze frame)
- Terminal showing `pass.list()` output
- Code scrolling through `backend.mjs`
