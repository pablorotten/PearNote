/* global Bare, BareKit */

import process from 'bare-process'
globalThis.process = process

import RPC from 'bare-rpc'
import b4a from 'b4a'
import Hyperswarm from 'hyperswarm'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import goodbye from 'graceful-goodbye'
import { join } from 'bare-path'
import URL from 'bare-url'

import {
  RPC_ADD,
  RPC_REMOVE,
  RPC_RESET,
  RPC_MY_INVITE,
  RPC_PEER_JOINED,
  RPC_PEER_LEFT,
  RPC_DIAG
} from '../rpc-commands.mjs'

const { IPC } = BareKit

const rpc = new RPC(IPC, (req, error) => {
  if (req.command === RPC_ADD) {
    const movie = JSON.parse(b4a.toString(req.data))
    addMovie(movie)
  }
  if (req.command === RPC_REMOVE) {
    const key = b4a.toString(req.data)
    removeMovie(key)
  }
})

function diag(msg) {
  console.log('DIAG:', msg)
  try {
    const req = rpc.request(RPC_DIAG)
    req.send(msg)
  } catch (_) {}
}

diag('Backend started, argv: ' + JSON.stringify(Bare.argv))
diag('argv[0] type: ' + typeof Bare.argv[0] + ' length: ' + (Bare.argv[0] ? Bare.argv[0].length : 0))

let roomCode = Bare.argv[1] || null
if (!roomCode) {
  roomCode = String(Math.floor(1000 + Math.random() * 9000))
  diag('Created room, code: ' + roomCode)
  const req = rpc.request(RPC_MY_INVITE)
  req.send(roomCode)
} else {
  diag('Joining room with code: ' + roomCode)
  const req = rpc.request(RPC_MY_INVITE)
  req.send(roomCode)
}

const storagePath = join(URL.fileURLToPath(Bare.argv[0]), 'moviekollections')
diag('storagePath: ' + storagePath + ' roomCode: ' + roomCode)

const store = new Corestore(storagePath)
const core = store.get({ name: 'movielist-' + roomCode })
const bee = new Hyperbee(core, {
  keyEncoding: 'utf-8',
  valueEncoding: 'json'
})
await bee.ready()

const swarm = new Hyperswarm()
diag('Swarm created')
const peers = new Set()

swarm.on('connection', (conn) => {
  try {
    peers.add(conn)
    diag('Connection established, peer count: ' + peers.size)

    const req = rpc.request(RPC_PEER_JOINED)
    req.send('connected')

    sendFullList(conn)

    conn.on('data', (data) => {
      diag('Received data: ' + b4a.toString(data).substring(0, 80))
      try {
        const msg = JSON.parse(b4a.toString(data))
        if (msg.type === 'sync') { diag('Handling sync with ' + msg.movies.length + ' movies'); handleSync(msg.movies) }
        else if (msg.type === 'add') handleRemoteAdd(msg.key, msg.value)
        else if (msg.type === 'remove') handleRemoteRemove(msg.key)
      } catch (err) {
        diag('Error processing peer data: ' + err.message)
      }
    })

    conn.on('close', () => {
      diag('Connection closed')
      peers.delete(conn)
      const req = rpc.request(RPC_PEER_LEFT)
      req.send('disconnected')
    })

    conn.on('error', (err) => {
      diag('Connection error: ' + err.message)
      peers.delete(conn)
    })
  } catch (err) {
    diag('Error in connection handler: ' + err.message)
  }
})

swarm.on('error', (err) => {
  diag('Swarm error: ' + err.message)
})

goodbye(() => {
  diag('Swarm destroying')
  swarm.destroy()
})

function topicFromCode(code) {
  const buf = b4a.alloc(32)
  const codeBuf = b4a.from(code)
  buf.set(codeBuf)
  return buf
}

const discoveryKey = topicFromCode(roomCode)
diag('Joining swarm with discovery key: ' + b4a.toString(discoveryKey, 'hex'))
const discovery = swarm.join(discoveryKey, { client: true, server: true })
await discovery.flushed()
diag('Swarm join flushed')

notifyUI()

async function sendFullList(conn) {
  const movies = []
  for await (const { key, value } of bee.createReadStream()) {
    movies.push({ key, value })
  }
  conn.write(b4a.from(JSON.stringify({ type: 'sync', movies })))
}

function broadcast(msg) {
  diag('Broadcasting to ' + peers.size + ' peers: ' + msg.type)
  const data = b4a.from(JSON.stringify(msg))
  for (const peer of peers) {
    try {
      peer.write(data)
    } catch (err) {
      diag('Error broadcasting: ' + err.message)
    }
  }
}

async function notifyUI() {
  const movies = []
  for await (const { key, value } of bee.createReadStream()) {
    movies.push({ key, value })
  }
  const req = rpc.request(RPC_RESET)
  req.send(JSON.stringify(movies))
}

async function addMovie(movie) {
  const key = 'movie:' + Date.now()
  const title = movie[1]
  diag('Adding movie: ' + title)
  await bee.put(key, ['movie', title])
  await notifyUI()
  broadcast({ type: 'add', key, value: ['movie', title] })
}

async function removeMovie(key) {
  diag('Removing movie: ' + key)
  await bee.del(key)
  await notifyUI()
  broadcast({ type: 'remove', key })
}

async function handleSync(movies) {
  for (const { key, value } of movies) {
    const existing = await bee.get(key)
    if (!existing) await bee.put(key, value)
  }
  await notifyUI()
}

async function handleRemoteAdd(key, value) {
  await bee.put(key, value)
  await notifyUI()
}

async function handleRemoteRemove(key) {
  await bee.del(key)
  await notifyUI()
}
