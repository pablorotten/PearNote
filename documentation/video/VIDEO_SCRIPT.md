# PearNote: P2P Note Sync with Holepunch

## App demo

* Show the app in action with 2 and 3 phones:
  * Creata note
  * Share it
  * Add/Remove items
* Ask: Why is this so special? It's just a collaborative sticky note app? There're millions of them in the market
  > [!NOTE] Show screenshots of other notes apps 

## Client-server vs P2P

* This is a zero-infrastructure collaborative app!!
> [!NOTE] Show how a classic client-server architecture looks
* There's no centralized and costly server or cloud service.
> [!NOTE] Show a big fat expensive and exhausting server and then break the diagram and transform it into a P2P architecture
* The app is fully decentralized
> [!NOTE] Show an animation of the client-server architecture transforming into into a P2P architecture

## Introducing Holepunch

> [!NOTE] Show logo and web


## The backend: Bare

https://github.com/holepunchto/bare

Introducing Holepunch's Bare.

> [!NOTE] Show Bare icon

We mentioned before that this is a zero-infrastructure app without server.

> [!NOTE] Show again the transformation fro

But then, who stores de data? Who receive all the frontend requests? How syncs  data between users? Does it mean there's no backend?

> [!NOTE] Question marks with icons appearing

No! it means that the backend is not centralized.

Each peer has a backend running their phones

Bare is the worklet. It's a minimal JavaScript thread running the backend code in the background. This worklet runs the backend logic that normally goes into a server instance. But in this case runs locally in our phone.

> [!NOTE] Animation of the phone running 2 threads, one with he main app and the other with the backend code `backend.msj`

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

<<< ADD HERE >>>


## The Syncronization: Autobase

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


