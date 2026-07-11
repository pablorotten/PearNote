# PearNote: P2P Note Sync with Holepunch

## App demo

* Show the app in action with 2 and 3 phones:
  * Creata note
  * Share it
  * Add/Remove items
* Ask: Why is this so special? It's just a collaborative sticky note app?
  > [!NOTE] Show screenshots of other notes apps 
* Explain that P2P:
  * This is a zero-infrastructure collaborative app!!
  > [!NOTE] Show how a classic client-server architecture looks
  * There's no centralized and costly server or cloud service.
  > [!NOTE] Show a big fat expensive and exhausting server and then break the diagram and transform it into a P2P architecture
  * The app is fully decentralized
  > [!NOTE] Show an animation of the client-server architecture transforming into into a P2P architecture
* Tools overview:
  * Bare
  * Autopass
  * Corestore
  * Hypercore
  * Autobase
  * BlindPairing
  * Hyperswarm

## Internal architecture

We mentioned before that this is a zero-infrastructure app without server.

> [!NOTE] Show again the transformation fro

But then, who stores de data? Who receive all the frontend requests? How syncs  data between users? Does it mean there's no backend?

> [!NOTE] Question marks with icons appearing

No! it means that the backend is not centralized.

Each peer has a backend running their phones

### Bare

https://github.com/holepunchto/bare

Introducing Holepunch's Bare.

> [!NOTE] Show Bare icon

Bare is the worklet. It's a minimal JavaScript thread running the backend code in the background. This worklet runs the backend logic that normally goes into a server instance. But in this case runs locally in our phone.

> [!NOTE] Animation of the phone running 2 threads, one with he main app and the other with the backend code `backend.msj`

### Hyperstore + Corestore

> [!NOTE] Open the app and create a new note

We have just created a new note. But where is it stored? 

```js
const storagePath = join(baseDir, 'pearnote', sessionId)
const store = new Corestore(storagePath) 
```
* Build a new folder 
* Creates a new `Corestore` instance there.

> [!NOTE] Show [Corestore](https://docs.pears.com/reference/helpers/corestore/) page

> Corestore is a Hypercore factory that makes it easier to manage large collections of named Hypercores.

* But, what is **Hypercore**?
* Hypercore is a secure, distributed append-only log.

So we have just created our DATABASE using a log-like format. Here we will store all our notes and keep track of the whole history.

### Autopass

```js
pass = new Autopass(store)
```

**Autopass** is the *porcelain*. It's a facade library that makes it easy to create and manage P2P connections. 

> [!NOTE] Autopass has no official icon. Create one yourself

**Autopass** bundles Autobase, Hyperswarm, Corestore and BlindPairing.

> [!NOTE] Show Autopass wrapping all those libraries (whitch doesn't have icon so I have to create a lot)

With Autopass, I could write the whole backend of this app in a small script of 200 lines of code.

> [!NOTE] Show Autopass github

### Invite code

> [!NOTE] Show in the app the invite code and generated QR code

First thing Autopass do is to generate an invite code

```js
const invite = await pass.createInvite()
```

Now I can share this note with any peer


### Add an entry

> [!NOTE] Add an entry in a note in the app


### Autobase

[Autobase](https://docs.pears.com/reference/building-blocks/autobase/) it's the responsible of writing into the local Hypercores

```js
await pass.add(key, JSON.stringify(['item', title]))
```
* Autopass receives a `@autopass/put` request
* Autopass calls Autobase to append new entry `base.append()`
* Autobase appends the item in my local Hypercore (the log-like-DB)
* Autobase emits an `update` event adn Autopass forward it
```js
pass.on('update', () => { notifyUI() })
```
* Backend cathes it and updates the frontend `notifyUI()`

So far, `Autobase` job it's trivial. Only 1 peer writing and reading --> 1 single hypercore --> 1 single source of truth

But what if I start sharing my note with other peers and they start adding and deleting items? How will the syncronization work? What if 3 peers edit the same note offline and then syncronize? Will the note look the same in all the peers phones?


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

