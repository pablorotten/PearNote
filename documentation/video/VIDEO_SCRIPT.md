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
* Normally apps have two parts: frontend and backend
* In the client-server **a**rchitecture
* Frontend runs on your device — the app you install
* Backend runs on a server — it stores data, synchronises things, sends updates...
> [!NOTE] Show p2p architecture
* But we said there's no server! So who runs the backend code?

> [!NOTE] facecam
* That's right — no server here. This is where Bare comes into play
* With Bare, our device runs two processes: the normal frontend, and a Bare process running the backend
* All the logic that used to run on a server now runs locally on your phone
* That's how with Bare, the connected devices — the peers — replace a central server 

## The Storage: Hypercore

> [!NOTE] Open the app and create a new note

* We keep adding items to a note. But where are they stored? 

* Back to our old friend, the client-server **a**rchitecture

* Another comp**o**nent that normally lives on the server is the database. 

* But without server... where does the data live?

* You guessed it — this also moves to each peer's phone.

* That's what Hypercore does

* It turns a centralized database into a distributed one

> [!NOTE] what is hypercore

* Hypercore isn't a relational database
* It's not really a database at all
* It's more like a log — think of it as Git for your data

> [!NOTE] Split screen: Hypercore log (left) | PearNote (right) alternated with facecam

* Left side is a Hypercore log. Right side is PearNote.
* They start empty — no blocks, and an blank note.

* I add 🍎 Apples to the note 
* And a new block labeled "add: 🍎 Apples" appears on the log.
* That's one ev**e**nt. One block appended to the log.

* I add 🍌 Bananas
* a new block "add: 🍌 Bananas" connected below the first.
* Second event. Two blocks in the log now, one after the other.

* I don't want bananas. So I remove 🍌 Bananas from the note
* a third block "rmv: 🍌 Bananas" is appended to the log.

> [!NOTE] facecam
* This is very interesting!
* The note only shows 🍎 Apples now. 
* But the log still has all three entries
* In hypercore, nothing is erased.

* Finally I add 🥑 Avocado
* And we have our 4th block "add: 🥑 Avocado"

* So in the end my note has 2 items: 🍎 Apples and 🥑 Avocado.
* But the log has 4 entries. Every action is preserved — nothing gets deleted, only appended.
* That's Hypercore. It's an append-only log, just like Git.
* To know the current state, you replay every entry from start to finish.
* 
* We have our backend and our storage
* We can create notes locally
* But how do we share them with other people and collaborate?
* In other words — how do Hypercore blocks sync between peers in a P2P network?

## The Network: Hyperswarm

* Hyperswarm is the library that makes P2P networking possible
* Thanks to it we can find and connect to other peers
* For that there's a global phonebook called the **DHT**

> [!NOTE] facecam

* **Distributed Hash Table**
* The DHT is a huge table with two columns: **Topic → IP Address**
> [!NOTE] show the phone with the opened app
* The IP address identifies a peer — like a phone number
* A **topic** is what a peer is interested in, it's the reason they're in the DHT 
* The DHT isn't stored in one place. It's spread across the whole network. Every peer has a piece of it.

> [!NOTE] creating a note in pearnote, showing the invite code on screen

* In PearNote, when I create a note, a code is generated
* Inside that code is the **topic** — a unique ID for my note
* Looks like this (`3f1b7c29d8e4f6a1b2c3`), is a 32-byte hash.
* My phone is a peer, and every peer is a node in this P2P network
* And every node holds a small piece of the DHT table
* My phone, as a peer, writes a new entry into its piece of the DHT
* The topic is the hash that represetns my note
* Remember we said the DHT is like a phone book
* So I write in the phonebook the topic I'm interested in, the groceries list, and my number, my smartphone IP
* My phone tells the network: "Hey, I'm `203.0.113.1` and I'm interested in the topic `Groceries List`"
* Other peers replicate that same entry in their piece of the DHT: `3f1b7c29d8e4f6a1b2c3 → 203.0.113.1`
* That way, everyone in the network will know that I'm interested in `Groceries List` topic

**The Swarm — how peers connect**

> [!NOTE] Swarm of bees video or animation
So when someone scans that QR code, this is what happens behind the scenes


* We have our phone, the one that created the note, let's call it the HOST
* It has a Topic and an IP
* We generate a QR code to share the note
* This is the guest phone, it has a different IP
* Our friend scans the QR code and extracts the topic `3f1b7c29d8e4f6a1b2c3`
* Guest announces in his peer node DHT: "This is my IP and I'm also interested on this topic"
* Note that in Guest DHT there's already the host IP with same topic
* This is spread across the whole network, so all the peers now know that both guest and host are interested on same topic
* That's how the updated DHT looks — both phones are registered under the same topic
* Now guest and host have each other's IP and can establish a direct connection
* The DHT's job is done — the two peers talk directly from here on
* They start exchanging **Hypercore blocks** to sync note status

> [!NOTE] Two connected phones forming a swarm, then more joining

* All the peers connected to the same topic form a swarm
* In our example, the swarm is just two — host and guest
* If we share the note with more people, the swarm grows

## The Synchronization: Autobase

* The last library I want to talk about is Autobase
* We've seen that peers exchange Hypercore blocks over the P2P connection
* But now each phone has multiple Hypercores — one from every peer — each with their own sequence of adds and deletes
* So how do they agree on the final result?
* Green adds an apple and remove it, but Blue adds it again — is the apple there or not?
* If three peers add an avocado around the same time, will the note end up with three avocados?

* That's where **Autobase** comes in
* It takes all those Hypercores and linearizes them into a single order
* Every peer runs the same logic independently and arrives at the same result.No central server decides. Quite impressive if you think about it
* Thanks to Autobase, all the peers will see the same note in their screen

## Conclusion

* And that's it. That's all you need to build a decentralized P2P app without servers.

### Recap

* **Bare** — your backend
* **Hypercore** — your storage
* **Hyperswarm** — your network, with the DHT
* **Autobase** — your sync

### Outro

* Thanks for watching!
* I encourage you to check out the Holepunch libraries
* And give their new platform, Pear, a try
* I'll leave links to the app and the GitHub repository below
* See you!

# YouTube Video

## Titles

Straightforward / searchable:
- "Building a P2P App with No Server — Holepunch Stack Explained"
- "How I Built a Real-Time Sync App Without a Backend"
- "P2P Sync on Mobile: Holepunch, Bare, and Hypercore Explained"
Hook-first (problem → solution):
- "Your Notes App is Spying on You. I Built an Alternative."
- "I Removed the Server From a Real-Time App. Here's What Replaced It."
- "What If Your App Had No Server, No Database, No Accounts?"
Curiosity-driven:
- "Two Phones, One Note, Zero Servers — How Does It Work?"
- "The App That Syncs Without the Internet Knowing"
- "No Backend. No Cloud. No Accounts. How?"
Positioning / personal:W
- "I Built a Serverless P2P App in React Native — Here's the Stack"
- "How Holepunch Lets You Build Apps Without Infrastructure"

Final title: **I Removed the Server From a Real-Time App - Holepunch Stack Explained**

## Description

### Option A — Technical, direct
Most note apps send your data to a server you don't control. PearNote doesn't.

I built a real-time collaborative sticky notes app with no server, no database, 
and no user accounts — just two phones syncing directly, peer-to-peer.

In this video I explain the Holepunch stack that makes it possible:
➡️ Bare — a JavaScript runtime that runs your backend logic on-device
➡️ Hypercore — an append-only log that replaces a centralized database
➡️ Hyperswarm — a DHT-based network layer that connects peers directly
➡️ Autobase — the sync engine that resolves conflicts across multiple writers

Source code: https://github.com/pablorotten/PearNote
Holepunch: https://holepunch.to/
Pears (new platform): https://pears.com/

─────────────────────────
Find me here:
Website: https://pablorotten.github.io/cv/
LinkedIn: https://www.linkedin.com/in/pablo-antonio-rodriguez-rubio/
Instagram: https://www.instagram.com/pablodevrel/
TikTok: https://www.tiktok.com/@pablodevrel
Twitter/X: https://x.com/PabloDevRel

### Option B — Story-first, broader audience
What if your app had no server, no cloud, and no accounts — and still synced 
in real time between devices?

I built PearNote to find out. It's a collaborative sticky notes app where two 
phones share a live list directly, peer-to-peer, with no middleman.

The secret is the Holepunch stack — a set of JavaScript libraries that handle 
storage, networking, and sync without any infrastructure. I'll walk you through 
how each piece works and show you the app running live.

Source code: https://github.com/pablorotten/PearNote
Holepunch: https://holepunch.to/
Pears (new platform): https://pears.com/

─────────────────────────
Find me here:
Website: https://pablorotten.github.io/cv/
LinkedIn: https://www.linkedin.com/in/pablo-antonio-rodriguez-rubio/
Instagram: https://www.instagram.com/pablodevrel/
TikTok: https://www.tiktok.com/@pablodevrel
Twitter/X: https://x.com/PabloDevRel

### Option C — Short and punchy
No server. No database. No accounts. Just two phones sharing a live note directly.

I built PearNote using the Holepunch stack (Bare, Hypercore, Hyperswarm, Autobase) 
and this video explains how it works — and why P2P apps are worth paying attention to.

Source code: https://github.com/pablorotten/PearNote
Holepunch: https://holepunch.to/
Pears (new platform): https://pears.com/

─────────────────────────
Website: https://pablorotten.github.io/cv/
LinkedIn: https://www.linkedin.com/in/pablo-antonio-rodriguez-rubio/
Instagram: https://www.instagram.com/pablodevrel/
TikTok: https://www.tiktok.com/@pablodevrel
Twitter/X: https://x.com/PabloDevRel
Option A is best if your primary audience is developers who might search for "Holepunch" or "P2P React Native." Option B works better if you want broader reach and plan to share it on social. Option C is good as a base if you want to tweak it yourself.

# Short (LinkedIn / TikTok / Instagram / X)

YouTube video: https://youtu.be/B8783WSrCjI

## Title

I built a collaborative app with no server, no cloud, no accounts

## Description

Two phones. One shared note. Zero servers.

I built PearNote using the Holepunch P2P stack — no backend, no database, no user accounts. Just devices talking directly.

Full breakdown in the video 👇

*(YouTube Shorts and TikTok — paste the YouTube link directly here)*

---

For LinkedIn, Instagram and X — replace last line with:

Full breakdown in the comments 👇

## First comment (with link)

Full video here: https://youtu.be/B8783WSrCjI

## Where to use each approach

| Platform | Links in description | Technique |
|---|---|---|
| LinkedIn | Penalized in reach | Link in first comment |
| Instagram | Links not clickable | Link in first comment |
| X (Twitter) | Allowed but limits reach | Link in first comment (or last) |
| TikTok | Allowed for some accounts | Link in description if available, otherwise bio |
| YouTube Shorts | Fine | Link directly in description |