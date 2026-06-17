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
  RPC_ERROR,
  RPC_SET_NAME
} from '../rpc-commands.mjs'

const { IPC } = BareKit
const INIT_TIMEOUT = 30000

const rpc = new RPC(IPC, (req, error) => {
  if (error) return
  if (req.command === RPC_ADD) {
    const item = JSON.parse(b4a.toString(req.data))
    addItem(item)
  }
  if (req.command === RPC_REMOVE) {
    const key = b4a.toString(req.data)
    removeItem(key)
  }
  if (req.command === RPC_CLEAR) {
    clearAll()
  }
  if (req.command === RPC_SET_NAME) {
    const name = b4a.toString(req.data)
    setListName(name)
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
      // Create a new list with a unique storage path
      const sessionId = Date.now().toString(36)
      const storagePath = join(URL.fileURLToPath(baseDir), 'p2pkollections', sessionId)
      diag('Creating new list, storagePath: ' + storagePath)
      
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
      // Join an existing list using invite code from another device
      const sessionId = Date.now().toString(36)
      const storagePath = join(URL.fileURLToPath(baseDir), 'p2pkollections', sessionId)
      diag('Joining list, storagePath: ' + storagePath)
      
      const store = new Corestore(storagePath)
      const { promise: pairTimeout, cancel: cancelPair } = timeoutPromise(INIT_TIMEOUT, 'Autopass.pair().finished()')
      
      const pair = Autopass.pair(store, storageId) // storageId is the invite code here
      pass = await Promise.race([pair.finished(), pairTimeout])
      cancelPair()
      
      await pass.ready()
      
      diag('Joined list')
      
      // Send storageId (folder name) and invite
      try { rpc.request(RPC_MY_INVITE).send(sessionId + '|' + storageId) } catch (_) {}
      
    } else if (mode === 'rejoin') {
      // Rejoin an existing list - storageId is the folder name
      const storagePath = join(URL.fileURLToPath(baseDir), 'p2pkollections', storageId)
      diag('Rejoining list, storagePath: ' + storagePath)
      
      const store = new Corestore(storagePath)
      const { promise: readyTimeout, cancel: cancelReady } = timeoutPromise(INIT_TIMEOUT, 'Autopass.ready()')
      
      // Just create Autopass with the store - it will load the existing base
      pass = new Autopass(store)
      await Promise.race([pass.ready(), readyTimeout])
      cancelReady()
      
      diag('Rejoined list')
      
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
    const items = []
    const stream = pass.list()
    for await (const record of stream) {
      items.push({ key: record.key, value: JSON.parse(record.value) })
    }
    try { rpc.request(RPC_RESET).send(JSON.stringify(items)) } catch (_) {}
  } catch (err) {
    diag('notifyUI error: ' + err.message)
  }
}

async function addItem(item) {
  if (!pass) return
  try {
    const key = 'item:' + Date.now()
    const title = item[1]
    diag('Adding item: ' + title)
    await pass.add(key, JSON.stringify(['item', title]))
  } catch (err) {
    diag('addItem error: ' + err.message)
  }
}

async function setListName(name) {
  if (!pass) return
  try {
    diag('Setting list name: ' + name)
    await pass.add('_list_name', JSON.stringify(['_name', name]))
  } catch (err) {
    diag('setListName error: ' + err.message)
  }
}

async function removeItem(key) {
  if (!pass) return
  try {
    diag('Removing item: ' + key)
    await pass.remove(key)
  } catch (err) {
    diag('removeItem error: ' + err.message)
  }
}

async function clearAll() {
  if (!pass) return
  try {
    diag('Clearing all items')
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
