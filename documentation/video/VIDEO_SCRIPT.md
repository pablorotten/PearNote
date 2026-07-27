# PearNote: P2P Note Sync with Holepunch

## Intro

Let's talk about Sticky notes apps.

There're dozens of them: Apple notes, Google keep, One note, ... and many more

But all of them share the same architecture

> [!NOTE] cliente-server schema

* So first everybody create an account. That's how the app knows who you are.
* Then you make a note and it gets sent to a server somewhere.
* When you share it with friends, the server makes copies for each of them.
* Now if someone writes something, it goes back to the server first, and the server sends the update to everyone else.
* This is the classic "CLIENT-SERVER" architecture

> [!NOTE] facecam for disadvantages

This model works fine, but there're many disadvantages

* There're servers to mantain. They are expensive, hackable, and a legal headache if sensitive data leaks.
* As more people join, costs go up
* Your data belongs to them, not you. Most apps can read your notes, and they track what you do.
* They need your account to identify you — that's personal info you're handing over just to write sticky notes.
* And if the company shuts down? Your notes disappear with it.

## App demo

> [!NOTE] Talking head: client-server schema is small on screen. Then it zooms big and morphs into the P2P schema

* It looks like maintaining a central server is a headache and brings up a lot of privacy concerns
* Would it be possible to have a collaborative sticky notes app without user accounts and without server?
* Just people sharing notes dir**e**ctly, no middleman
* This architecture exists, and it's called Peer-to-Peer.

> [!NOTE] Facecam showing the app in the phone

* And guess what? I built it!
* It's called PearNote — a note app using P2P technology

> [!NOTE] PearNote screencast

* It's really simple. You open PearNote, create a new note, and get a key and a QR code.
* Then your friends scan the QR code with their phones
* The note appears on their screen — now you're sharing it
* Everyone can add and remove items together, in real time
* All this without server and without account!!! 
* I'll explain you how I did it!

## Introducing Holepunch

> [!NOTE] Show logo and web

* This is all thanks to Holepunch — a company that builds tools for creating apps with no servers
* They provide a toolbox of JavaScript modules that handle the hard parts: st**o**rage, n**e**tworking, synchronisation 
* So I didn't have to build P2P from scratch — I just glued their pieces together
* I'll explain you the most interesting ones

## The backend: Bare

https://github.com/holepunchto/bare


> [!NOTE] Show Bare icon

Introducing Bare.

> [!NOTE] Show client-server architecture
* Normally, apps code is divided in 2: frontend and backend
* Frontend is the piece of code that runs on your device. The app you install, the webpage you open
* Meanwhile backend code runs on a server. This logic syncronize your app, stores your data in the cloud, send you updates, etc
> [!NOTE] Show p2p architecture
* But we said there's no server! So... who runs the Backend code?
* That's right, in our p2p architecture there's no server
* Thanks to Bare we can have in our device 2 processes: the normal one running the frontend and Bare process running the backend code.
* All the logic that used to run in a server, now runs locally in our device

We mentioned before that this is a zero-infrastructure app without server.

> [!NOTE] Show again the transformation from client-server to P2P

But then, who stores the data? Who receives all the frontend requests? How does data sync between users? Does it mean there's no backend?

> [!NOTE] Question marks with icons appearing

No! it means that the backend is not centralized.

Each peer has a backend running their phones

Bare is the worklet. It's a minimal JavaScript thread running the backend code in the background. This worklet runs the backend logic that normally goes into a server instance. But in this case runs locally in our phone.

> [!NOTE] Animation of the phone running 2 threads, one with the main app and the other with the backend code `backend.msj`

## The Storage: Hypercore

> [!NOTE] Open the app and create a new note

We have just created a new note. But where is it stored? 

Another component that normally goes in the Server is the database. And you guessed well... this is also moved to each peer smartphone.

But how can a server-centralized database become distributed?

Thanks to Hypercore

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

## The Network: Hyperswarm

* We have our backend and our storage
* We can create notes locally
* But how can we share them with other users and collaborate?

**The DHT — a global phonebook**

There's a thing called a **DHT** (Distributed Hash Table). Think of it as a giant phonebook that's spread across thousands of computers on the internet. It only has one type of entry: **Topic → IP Address**.

```
├───────────────────────────────────────┤
│  topic: a3f... → 203.0.113.42:54231  │
│  topic: b7c... → 198.51.100.77:32901 │
│  topic: a3f... → 192.0.2.15:12048    │
├───────────────────────────────────────┤
```

A **topic** is just a hash — an identifier. Each app decides what a topic means:

- **Keet** (Holepunch's chat app): each chat room is a topic
- **File sharing app**: each shared folder is a topic
- **PearNote**: each note is a topic

All apps share the **same DHT**. Topics from different apps are all mixed in the same table — it doesn't matter, because only the people who know the topic hash can query it.

**No one owns the DHT.** It's distributed across all peers connected to the Hyperswarm network. Every phone running a Hyperswarm app stores a small piece of it.

**Bootstrap nodes** are special peers hardcoded into the Hyperswarm library. They've been online for a long time, so they know a lot of peers and have a big piece of the DHT table. They're the **first person you ask for directions when you arrive in a new city** — they point you in the right direction, then you're on your own.

> [!NOTE] Bootstrap nodes don't store any business data. They're just matchmakers, like a DNS server but for P2P.

**The Swarm — how peers connect**

When you create a note, your phone tells the DHT: *"I'm interested in topic X"* (the note's hash). Your IP is now discoverable by anyone querying that topic.

When a second user scans your QR code, they extract the topic hash, query the DHT, and get your IP back.

Now both phones know each other's address. Hyperswarm opens a **direct P2P connection** between them. This uses **UDP hole-punching**, the same technique Skype and WebRTC use to connect two devices that are both behind routers:

```
Phone A ←→ DHT ←→ Phone B  (just the introduction)
Phone A ←──────────────── Phone B  (direct P2P connection)
```

Once the direct connection is established, the DHT is no longer involved.

So what do they send to each other? **Hypercore blocks.**

Every time you add or remove an item, **Autobase** appends a new block to your local Hypercore (the log). It then streams that block over the P2P connection to every connected peer. The receiving peer writes it to their local copy of your Hypercore, replays it, and updates the note.

This is why the architecture works for offline edits too. When a peer goes offline and edits, those changes are just new blocks at the end of their local Hypercore. When they reconnect, the P2P connection reopens, and **all the missed blocks sync automatically** — like Git pushing commits.

This group of directly connected peers sharing the same topic is called the **swarm**. More peers can join the same way — scan the QR, find the host via the DHT, connect directly. Everyone in the swarm receives updates from everyone else.

> [!NOTE] Animation: Phone A creates note → joins DHT topic. Phone B scans QR → finds A via DHT → direct connection established. Then both add items and changes flow directly between them, DHT fades out.

## The Synchronization: Autobase

We've seen that peers exchange **Hypercore blocks** over the Hyperswarm connection. But that means each phone now has multiple Hypercores — one from each peer — all with their own sequence of adds and deletes.

How do we turn that mess into one single consistent note that looks the same on every phone?

That's what **Autobase** does. Autobase takes all those Hypercores from all peers, linearizes them into a single deterministic order, and produces one source of truth.

```
Peer A Hypercore: [PUT milk] [PUT bread]
Peer B Hypercore: [PUT eggs] [DEL bread]
Peer C Hypercore: [PUT butter]
         ↓
    Autobase
         ↓
    Result: { milk, butter, eggs }  ← same on every phone
```

> [!NOTE] Animation: three Hypercore logs merging into one combined view

The key property is **deterministic**: every peer runs the same algorithm on the same logs and arrives at the same result. No server decides the truth.

This is what enables offline edits too. When peers reconnect, Autobase replays all the blocks that were accumulated while offline and converges to the same state.

**What about conflicts?**

Autobase doesn't know the semantics of your data. If Peer A adds "Milk" and Peer B deletes "Milk" while offline, Autobase picks a deterministic winner — but it doesn't ask you which one to keep. For a note app that's fine. For a bank account you'd need custom logic on top.