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
  * Holepunch stack
  * Autopass
  * Corestore
  * Hypercore
  * Hyperswarm
  * Bare

## Internal architecture

But how does it work?

### The infrastructure

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

> [!NOTE] Animation of the phien running 2 threads, one with he main app and the other witht the backend code `backend.msj`

### Autopass

In the backend, I'm mainly using **Autopass**. This is the *porcelain*. It's a library that makes it easy to create and manage P2P connections. 

> [!NOTE] Autopass has no official icon. Create one yourself

**Autopass** bundles Autobase, Hyperswarm, Corestore and BlindPairing.

> [!NOTE] Show Autopass wrapping all those libraries (whitch doesn't have icon so I have to create a lot)

With Autopass, I could write the whole backend of this app in a small script of 200 lines of code.


> [!NOTE] Show Autopass github
> 
This is what happens behind the courtains: 

### Hyperstore + Corestore

> [!NOTE] Open the app and create a new note

We have just created a new note. But where is it stored? 

```js
const storagePath = join(baseDir, 'pearnote', sessionId)
const store = new Corestore(storagePath) 
```
It creates a new folder and starts a new `Corestore` there.






