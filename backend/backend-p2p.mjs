// Phone-to-Phone P2P Backend using Hyperswarm
/* global Bare, BareKit */

import RPC from 'bare-rpc'
import b4a from 'b4a'
import Hyperswarm from 'hyperswarm'
import goodbye from 'graceful-goodbye'
import { RPC_MESSAGE, RPC_CONNECTED, RPC_DISCONNECTED, RPC_ROOM_CODE } from '../rpc-commands.mjs'

const { IPC } = BareKit

const rpc = new RPC(IPC, (req, error) => {
  // Handle incoming RPC requests from frontend
  if (req.command === RPC_MESSAGE) {
    // Broadcast message to all connected peers
    const message = b4a.toString(req.data)
    broadcastMessage(message)
    req.reply(null)
  }
})

// Hyperswarm setup
const swarm = new Hyperswarm()
goodbye(() => swarm.destroy())

let peers = new Set()

const mode = Bare.argv[1] // 'create' or 'join'
const roomCode = Bare.argv[2] || null

// Generate or use discovery key from room code
let discoveryKey

if (mode === 'create') {
  // Create a new room with random discovery key
  // Using a simple random generation
  const randomBytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    randomBytes[i] = Math.floor(Math.random() * 256)
  }
  discoveryKey = b4a.from(randomBytes)
  
  // Generate a simple 6-character room code from the discovery key
  const simpleCode = b4a.toString(discoveryKey, 'hex').substring(0, 12).toUpperCase()
  
  // Send room code to frontend
  const req = rpc.request(RPC_ROOM_CODE)
  req.send(simpleCode)
  
  console.log('Created room with code:', simpleCode)
} else if (mode === 'join') {
  // Join existing room using provided code
  if (!roomCode) {
    console.error('Room code required for join mode')
    Bare.exit(1)
  }
  
  // Reconstruct discovery key from room code
  // In production, you'd use a proper key derivation
  const fullHex = roomCode.toLowerCase().padEnd(64, '0')
  discoveryKey = b4a.from(fullHex, 'hex')
  
  console.log('Joining room with code:', roomCode)
}

// Join the swarm
const discovery = swarm.join(discoveryKey, { server: mode === 'create', client: true })
await discovery.flushed()

// Handle new connections
swarm.on('connection', (conn) => {
  console.log('New peer connected!')
  peers.add(conn)
  
  // Notify frontend
  const req = rpc.request(RPC_CONNECTED)
  req.send('peer-connected')
  
  // Handle incoming messages from peer
  conn.on('data', (data) => {
    try {
      const message = b4a.toString(data)
      console.log('Received message:', message)
      
      // Forward to frontend
      const req = rpc.request(RPC_MESSAGE)
      req.send(JSON.stringify({ 
        from: 'peer', 
        text: message,
        timestamp: Date.now()
      }))
    } catch (err) {
      console.error('Error processing message:', err)
    }
  })
  
  conn.on('close', () => {
    console.log('Peer disconnected')
    peers.delete(conn)
    
    // Notify frontend
    const req = rpc.request(RPC_DISCONNECTED)
    req.send('peer-disconnected')
  })
  
  conn.on('error', (err) => {
    console.error('Connection error:', err)
    peers.delete(conn)
  })
})

// Function to broadcast message to all peers
function broadcastMessage(message) {
  const data = b4a.from(message)
  for (const peer of peers) {
    try {
      peer.write(data)
    } catch (err) {
      console.error('Error sending to peer:', err)
    }
  }
}

console.log(`P2P Backend started in ${mode} mode`)
