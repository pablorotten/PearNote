# MovieKollections

## 🚀 Now Available: Phone-to-Phone P2P Messaging!

This project has been upgraded to support **direct phone-to-phone messaging** using Hyperswarm P2P - no desktop app or servers needed!

### Two Versions Available:

#### 🆕 **P2P Messaging Version** (Recommended)
- Direct phone-to-phone communication
- Simple room codes for pairing
- Real-time messaging
- Zero servers, true P2P

➡️ **[Get Started with P2P Version →](README-P2P.md)**

#### 📦 **Original Password Manager Version**
- Syncs with Pearpass desktop app
- Password viewing on mobile
- Uses Autopass protocol

---

## 🎯 Quick Start (P2P Version)

```bash
# 1. Install dependencies
npm install

# 2. Setup P2P version (automated)
npm run setup-p2p

# 3. Run on your device
npm run android
# or
npm run ios
```

### Using the App:

**Phone 1:** Create Room → Share code  
**Phone 2:** Enter code → Join Room  
**Result:** Direct P2P messaging! 🎉

---

## 📚 Documentation

- **[README-P2P.md](README-P2P.md)** - Complete P2P overview
- **[SETUP-P2P.md](SETUP-P2P.md)** - Detailed setup guide  
- **[P2P-FLOW.md](P2P-FLOW.md)** - Connection flow diagrams
- **[ARCHITECTURE-COMPARISON.md](ARCHITECTURE-COMPARISON.md)** - Old vs new comparison

---

## 🏗️ How It Works

```
Phone 1                    Hyperswarm DHT                    Phone 2
  │                               │                               │
  ├─ Create Room                  │                               │
  ├─ Code: A1B2C3D4E5F6          │                               │
  │                               │                               │
  │────────── Join Swarm ────────►│◄────── Join Swarm ───────────│
  │                               │                               │
  │◄────── Peer Discovery ───────┤────── Peer Discovery ────────►│
  │                               │                               │
  │◄═══════════ Direct P2P Connection (No Servers!) ════════════►│
  │                               │                               │
  ├─ "Hello!" ──────────────────────────────────────────────────►│
  │◄───────────────────────────────────────────── "Hi there!" ───┤
```

**Powered by:** Hyperswarm P2P networking + Bare runtime 🍐

---

## 🛠️ Tech Stack

- **Bare** - Lightweight React Native runtime
- **Hyperswarm** - P2P networking & NAT traversal
- **React Native + Expo** - Mobile framework
- **bare-rpc** - IPC communication
- **TypeScript** - Type safety

---

## 📱 Features

✅ True P2P (no servers)  
✅ Simple room codes  
✅ Real-time messaging  
✅ NAT traversal (works behind firewalls)  
✅ Clean, intuitive UI  
✅ Connection status indicators  

---

## 🔄 Switch Between Versions

### Use P2P Version:
```bash
npm run setup-p2p
```

### Use Original Version:
```bash
cp app/index-original.tsx app/index.tsx
cp backend/backend-original.mjs backend/backend.mjs
npm run build-bundle
```

---

## 📄 License

Apache-2.0

---

**Built with 🍐 by the Holepunch community**
