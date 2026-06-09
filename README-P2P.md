# MovieKollections - Phone-to-Phone P2P Messaging

A **true peer-to-peer mobile messaging app** built with React Native + Bare + Hyperswarm. No servers, no desktop app required - just phone to phone! 🍐

## 🎯 What This Does

**Direct Phone-to-Phone Communication:**
- Phone 1 creates a room → gets a simple 12-character code
- Phone 2 enters the code → instantly connects via P2P
- Both phones can send/receive messages in real-time
- **Zero servers** - pure peer-to-peer using Hyperswarm

## 🏗️ Architecture

```
┌─────────────────┐         Hyperswarm P2P         ┌─────────────────┐
│   Phone 1       │ ◄────────────────────────────► │   Phone 2       │
│                 │                                 │                 │
│  React Native   │                                 │  React Native   │
│       ↕         │                                 │       ↕         │
│  Bare Worklet   │                                 │  Bare Worklet   │
│  (Hyperswarm)   │                                 │  (Hyperswarm)   │
└─────────────────┘                                 └─────────────────┘
```

**Frontend (React Native/Expo):**
- Two-mode UI: Create Room or Join Room
- Real-time message display
- Connection status indicators
- Room code sharing

**Backend (Bare Worklet):**
- Hyperswarm P2P networking
- Discovery key generation
- Peer connection management
- Message broadcasting

**IPC Communication:**
- `bare-rpc` for frontend ↔ backend messaging
- Real-time status updates

## 🚀 How to Use

### Installation

```bash
npm install
```

### Run on Android

```bash
npm run android
```

### Using the App

#### Phone 1 (Create Room):
1. Open the app
2. Tap **"Create Room"**
3. You'll get a 12-character code like `A1B2C3D4E5F6`
4. Share this code with Phone 2 (via SMS, WhatsApp, etc.)
5. Wait for Phone 2 to connect
6. Start messaging!

#### Phone 2 (Join Room):
1. Open the app
2. Enter the 12-character code from Phone 1
3. Tap **"Join Room"**
4. Connection established!
5. Start messaging!

## 🔧 Tech Stack

- **Bare** - Lightweight React Native runtime
- **Hyperswarm** - P2P networking & discovery
- **Corestore** - Local storage (Hypercore)
- **React Native + Expo** - Mobile UI framework
- **bare-rpc** - Inter-process communication
- **TypeScript** - Type safety

## 📁 Project Structure

```
MovieKollections/
├── app/
│   ├── index-p2p.tsx           # Phone-to-phone frontend (NEW)
│   ├── index.tsx                # Original password manager frontend
│   └── app.bundle.mjs
├── backend/
│   ├── backend-p2p.mjs          # Phone-to-phone backend (NEW)
│   └── backend.mjs              # Original Autopass backend
├── rpc-commands.mjs             # RPC command definitions
└── package.json
```

## 🔄 Switching Between Versions

### Use Phone-to-Phone Version (NEW):
1. Update bundle to use `backend-p2p.mjs`:
   ```bash
   # In your bundler config or manually copy
   cp backend/backend-p2p.mjs backend/backend.mjs
   ```
2. Update main app entry:
   ```bash
   cp app/index-p2p.tsx app/index.tsx
   ```

### Use Original Password Manager:
- Use the original `backend/backend.mjs` and `app/index.tsx`

## 🎨 Features

✅ **No Central Server** - True P2P using Hyperswarm  
✅ **Simple Room Codes** - Easy 12-character codes to share  
✅ **Real-time Messaging** - Instant message delivery  
✅ **Connection Status** - Visual indicators for peer status  
✅ **Clean UI** - Intuitive two-mode interface  
✅ **Clipboard Integration** - Easy code sharing  

## 🔐 How the P2P Magic Works

### Discovery Key Generation
```javascript
// Phone 1 creates a random discovery key
const discoveryKey = crypto.randomBytes(32)
const roomCode = discoveryKey.toString('hex').substring(0, 12)

// Phone 2 reconstructs the discovery key from the room code
const fullHex = roomCode.toLowerCase().padEnd(64, '0')
const discoveryKey = Buffer.from(fullHex, 'hex')
```

### Hyperswarm Connection
```javascript
// Both phones join the same swarm using the discovery key
const swarm = new Hyperswarm()
swarm.join(discoveryKey, { server: true, client: true })

// Automatically discover and connect to each other
swarm.on('connection', (conn) => {
  // Send/receive messages over the connection
  conn.write(message)
  conn.on('data', (data) => { /* receive message */ })
})
```

## 🧪 Development

### Build the Bundle
```bash
npx bare-pack --defer autopass --defer corestore -o app/app.bundle.mjs backend/backend-p2p.mjs
```

### Debug Mode
Check terminal logs in the app for connection status:
```
P2P Backend started in create mode
Created room with code: A1B2C3D4E5F6
New peer connected!
```

## 📝 RPC Commands

| Command | Direction | Purpose |
|---------|-----------|---------|
| `RPC_MESSAGE` | Both | Send/receive messages |
| `RPC_CONNECTED` | Backend → Frontend | Peer connected |
| `RPC_DISCONNECTED` | Backend → Frontend | Peer disconnected |
| `RPC_ROOM_CODE` | Backend → Frontend | Room code generated |

## 🐛 Troubleshooting

**"Waiting for peer..." never connects:**
- Ensure both phones have internet connection
- Verify the room code was entered correctly (case-insensitive)
- NAT traversal may take 10-20 seconds
- Check if firewall/network blocks UDP (Hyperswarm uses UDP hole punching)

**Messages not sending:**
- Confirm connection status shows "Connected"
- Check backend logs for errors
- Restart the app and try again

## 🌟 Future Enhancements

- [ ] End-to-end encryption
- [ ] Group messaging (3+ peers)
- [ ] File sharing
- [ ] Voice messages
- [ ] Message persistence (using Hyperbee)
- [ ] QR code for room sharing

## 📚 Learn More

- [Hyperswarm Documentation](https://github.com/holepunchto/hyperswarm)
- [Bare Runtime](https://github.com/holepunchto/bare)
- [Holepunch Ecosystem](https://holepunch.to)

## 📄 License

Apache-2.0

---

**Built with 🍐 by the Holepunch community**

*No servers. No middlemen. Just pure P2P magic.*
