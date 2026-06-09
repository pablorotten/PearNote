// Native Hyperswarm backend running in React Native thread (no worklet)
import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'

export function createRoom() {
  const swarm = new Hyperswarm()
  const topic = crypto.randomBytes(32)
  
  const discovery = swarm.join(topic, { server: true, client: false })
  
  return {
    topic,
    roomCode: b4a.toString(topic, 'hex').slice(0, 12),
    swarm,
    discovery
  }
}

export function joinRoom(roomCode) {
  const swarm = new Hyperswarm()
  // Reconstruct topic from room code...
  const topic = b4a.from(roomCode.padEnd(64, '0'), 'hex')
  
  const discovery = swarm.join(topic, { server: false, client: true })
  
  return {
    topic,
    swarm,
    discovery
  }
}
