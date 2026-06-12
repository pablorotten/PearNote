/* global Bare, BareKit */

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
  RPC_PEER_LEFT
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

const storagePath = join(URL.fileURLToPath(Bare.argv[0]), 'moviekollections')
const roomCode = Bare.argv[1] || null

const store = new Corestore(storagePath)
const core = store.get({ name: 'movielist' })
const bee = new Hyperbee(core, {
  keyEncoding: 'utf-8',
  valueEncoding: 'json'
})
await bee.ready()

const swarm = new Hyperswarm()
goodbye(() => swarm.destroy())

function topicFromCode(code) {
  const buf = b4a.alloc(32)
  const codeBuf = b4a.from(code)
  buf.set(codeBuf)
  return buf
}

let discoveryKey

if (!roomCode) {
  const simpleKey = String(Math.floor(1000 + Math.random() * 9000))
  discoveryKey = topicFromCode(simpleKey)
  const req = rpc.request(RPC_MY_INVITE)
  req.send(simpleKey)
} else {
  discoveryKey = topicFromCode(roomCode)
}

const discovery = swarm.join(discoveryKey, { client: true, server: true })
await discovery.flushed()

const peers = new Set()

swarm.on('connection', (conn) => {
  peers.add(conn)

  const req = rpc.request(RPC_PEER_JOINED)
  req.send('connected')

  sendFullList(conn)

  conn.on('data', (data) => {
    try {
      const msg = JSON.parse(b4a.toString(data))
      if (msg.type === 'sync') handleSync(msg.movies)
      else if (msg.type === 'add') handleRemoteAdd(msg.key, msg.value)
      else if (msg.type === 'remove') handleRemoteRemove(msg.key)
    } catch (err) {
      console.error('Error processing peer data:', err)
    }
  })

  conn.on('close', () => {
    peers.delete(conn)
    const req = rpc.request(RPC_PEER_LEFT)
    req.send('disconnected')
  })

  conn.on('error', (err) => {
    console.error('Connection error:', err)
    peers.delete(conn)
  })
})

async function sendFullList(conn) {
  const movies = []
  for await (const { key, value } of bee.createReadStream()) {
    movies.push({ key, value })
  }
  conn.write(b4a.from(JSON.stringify({ type: 'sync', movies })))
}

function broadcast(msg) {
  const data = b4a.from(JSON.stringify(msg))
  for (const peer of peers) {
    try {
      peer.write(data)
    } catch (err) {
      console.error('Error broadcasting:', err)
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
  await bee.put(key, movie)
  await notifyUI()
  broadcast({ type: 'add', key, value: movie })
}

async function removeMovie(key) {
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
