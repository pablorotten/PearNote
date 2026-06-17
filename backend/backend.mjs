/* global Bare, BareKit */

import RPC from 'bare-rpc'
import b4a from 'b4a'
import Autopass from 'autopass'
import Corestore from 'corestore'
import { join } from 'bare-path'
import URL from 'bare-url'

import {
  RPC_ADD,
  RPC_REMOVE,
  RPC_RESET,
  RPC_MY_INVITE,
  RPC_PEER_JOINED,
  RPC_PEER_LEFT,
  RPC_DIAG,
  RPC_CLEAR,
  RPC_ERROR
} from '../rpc-commands.mjs'

const { IPC } = BareKit
const INIT_TIMEOUT = 30000

const rpc = new RPC(IPC, (req, error) => {
  if (error) return
  if (req.command === RPC_ADD) {
    const movie = JSON.parse(b4a.toString(req.data))
    addMovie(movie)
  }
  if (req.command === RPC_REMOVE) {
    const key = b4a.toString(req.data)
    removeMovie(key)
  }
  if (req.command === RPC_CLEAR) {
    clearAll()
  }
})

function diag(msg) {
  console.log('DIAG:', msg)
  try {
    rpc.request(RPC_DIAG).send(msg)
  } catch (_) {}
}

function sendError(msg) {
  diag('ERROR: ' + msg)
  try {
    rpc.request(RPC_ERROR).send(msg)
  } catch (_) {}
}

function timeoutPromise(ms, label) {
  let timer
  const t = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timeout (' + ms + 'ms): ' + label)), ms)
  })
  return { promise: t, cancel: () => clearTimeout(timer) }
}

let pass

async function init() {
  try {
    // Args: [documentDirectory, mode, storageId?]
    // mode: 'create' | 'join' | 'rejoin'
    // For 'create': no storageId needed, will create new
    // For 'join': storageId is the invite code from another device
    // For 'rejoin': storageId is the storage folder name to rejoin
    
    const baseDir = Bare.argv[0]
    const mode = Bare.argv[1] || 'create'
    const storageId = Bare.argv[2] || null
    
    diag('mode: ' + mode + ' storageId: ' + (storageId || '(none)'))

    if (mode === 'create') {
      // Create a new room with a unique storage path
      const sessionId = Date.now().toString(36)
      const storagePath = join(URL.fileURLToPath(baseDir), 'moviekollections', sessionId)
      diag('Creating new room, storagePath: ' + storagePath)
      
      const store = new Corestore(storagePath)
      const { promise: readyTimeout, cancel: cancelReady } = timeoutPromise(INIT_TIMEOUT, 'Autopass.ready()')
      
      pass = new Autopass(store)
      await Promise.race([pass.ready(), readyTimeout])
      cancelReady()
      
      diag('Autopass ready')
      
      // Create invite for others to join
      const invite = await pass.createInvite()
      diag('Created invite: ' + invite)
      
      // Send storageId (folder name) and invite for sharing
      // Format: storageId|invite
      try { rpc.request(RPC_MY_INVITE).send(sessionId + '|' + invite) } catch (_) {}
      
    } else if (mode === 'join') {
      // Join an existing room using invite code from another device
      const sessionId = Date.now().toString(36)
      const storagePath = join(URL.fileURLToPath(baseDir), 'moviekollections', sessionId)
      diag('Joining room, storagePath: ' + storagePath)
      
      const store = new Corestore(storagePath)
      const { promise: pairTimeout, cancel: cancelPair } = timeoutPromise(INIT_TIMEOUT, 'Autopass.pair().finished()')
      
      const pair = Autopass.pair(store, storageId) // storageId is the invite code here
      pass = await Promise.race([pair.finished(), pairTimeout])
      cancelPair()
      
      await pass.ready()
      
      diag('Joined room')
      
      // Send storageId (folder name) and invite
      try { rpc.request(RPC_MY_INVITE).send(sessionId + '|' + storageId) } catch (_) {}
      
    } else if (mode === 'rejoin') {
      // Rejoin an existing room - storageId is the folder name
      const storagePath = join(URL.fileURLToPath(baseDir), 'moviekollections', storageId)
      diag('Rejoining room, storagePath: ' + storagePath)
      
      const store = new Corestore(storagePath)
      const { promise: readyTimeout, cancel: cancelReady } = timeoutPromise(INIT_TIMEOUT, 'Autopass.ready()')
      
      // Just create Autopass with the store - it will load the existing base
      pass = new Autopass(store)
      await Promise.race([pass.ready(), readyTimeout])
      cancelReady()
      
      diag('Rejoined room')
      
      // Create a new invite for this session
      const invite = await pass.createInvite()
      try { rpc.request(RPC_MY_INVITE).send(storageId + '|' + invite) } catch (_) {}
    }

    const peers = new Set()

    pass.swarm.on('connection', (conn) => {
      peers.add(conn)
      diag('Peer connected, count: ' + peers.size)
      try { rpc.request(RPC_PEER_JOINED).send('connected') } catch (_) {}

      conn.on('close', () => {
        peers.delete(conn)
        diag('Peer disconnected, count: ' + peers.size)
        try { rpc.request(RPC_PEER_LEFT).send('disconnected') } catch (_) {}
      })

      conn.on('error', () => {
        peers.delete(conn)
      })
    })

    pass.on('update', () => {
      notifyUI()
    })

    notifyUI()
  } catch (err) {
    diag('FATAL: ' + err.message + '\n' + (err.stack || ''))
    sendError(err.message)
  }
}

init()

async function notifyUI() {
  if (!pass) return
  try {
    const movies = []
    const stream = pass.list()
    for await (const record of stream) {
      movies.push({ key: record.key, value: JSON.parse(record.value) })
    }
    try { rpc.request(RPC_RESET).send(JSON.stringify(movies)) } catch (_) {}
  } catch (err) {
    diag('notifyUI error: ' + err.message)
  }
}

async function addMovie(movie) {
  if (!pass) return
  try {
    const key = 'movie:' + Date.now()
    const title = movie[1]
    diag('Adding movie: ' + title)
    await pass.add(key, JSON.stringify(['movie', title]))
  } catch (err) {
    diag('addMovie error: ' + err.message)
  }
}

async function removeMovie(key) {
  if (!pass) return
  try {
    diag('Removing movie: ' + key)
    await pass.remove(key)
  } catch (err) {
    diag('removeMovie error: ' + err.message)
  }
}

async function clearAll() {
  if (!pass) return
  try {
    diag('Clearing all movies')
    const stream = pass.list()
    const keys = []
    for await (const record of stream) {
      keys.push(record.key)
    }
    for (const key of keys) {
      await pass.remove(key)
    }
  } catch (err) {
    diag('clearAll error: ' + err.message)
  }
}
