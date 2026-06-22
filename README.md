<p align="center">
  <img src="design/splash.png" width="350" alt="PearNote">
</p>

<h1 align="center">PearNote</h1>

<p align="center">
  P2P note sharing for Android. No servers. No accounts. Just two phones.<br/>
  Built with <a href="https://holepunch.to">Holepunch</a> — Autopass, Corestore, Hyperswarm.
</p>

---

## What is it?

PearNote lets two phones share a note in real-time over a peer-to-peer connection. One phone creates a note and gets an invite code. The other phone joins with that code. From that moment, both phones see the same list — items added on one appear on the other instantly.

No cloud. No login. Data lives only on the phones.

## How it works

1. **Create** a note → get an invite code
2. **Share** the code (copy-paste or QR)
3. **Join** from another phone
4. **Sync** happens automatically over P2P

Changes merge deterministically using a CRDT (Autopass/Autobase), so even offline edits resolve correctly when peers reconnect.

## Download

Grab the latest APK from [**Releases**](../../releases).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Expo SDK 55 + Bare |
| P2P Sync | Autopass (Autobase + BlindPairing) |
| Storage | Corestore (Hypercore) |
| Networking | Hyperswarm (DHT) |
| UI | React Native |
| RPC | bare-rpc (IPC) |

## License

MIT
