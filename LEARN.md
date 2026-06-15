# Learnings from MovieKollections

## Q: What does 🟢 Connected mean inside a room?

When the backend receives a Hyperswarm connection — `swarm.on('connection', ...)` fires, which sends `RPC_PEER_JOINED` to the UI.

It means **at least one other peer is directly connected** via the P2P swarm. If you're alone in the room, it shows disconnected. If another phone is in the same room and the swarm connected, it turns green.

## Q: How many states does the connection logic have?

After loading completes (spinner disappears), there are 2 states:

| State | Condition | What's happening |
|---|---|---|
| **Disconnected** | After loading, no connection event | You're in the room, swarm is listening, but no other peer connected yet |
| **Connected** 🟢 | `RPC_PEER_JOINED` received | At least one peer connected via Hyperswarm |

There's also a **Loading** (spinner) phase before these states — backend starting up, loading local storage, joining the swarm.

The "searching for peers" phase is invisible to the user. Hyperswarm continuously looks for peers on the discovery key, but the UI only reflects it once a peer actually connects.

So the full flow is:

```
Loading → Disconnected (swarm searching in background) → Connected 🟢 (peer found)
                                                         → Disconnected (peer left)
```

## Q: This "searching" is periodic? Does it re-search from time to time?

Hyperswarm uses a **DHT (distributed hash table)** under the hood. When you call `swarm.join()`, it:

1. **Announces** your presence to the DHT for that discovery key
2. **Looks up** other peers already in that topic

The DHT announcements have a **time-to-live (TTL)**, so Hyperswarm automatically **re-announces** every ~5-10 minutes to keep your presence alive. It's not a manual search loop — just the DHT's natural refresh cycle.

When a new peer joins the same topic later, the DHT notifies both sides and Hyperswarm creates a direct connection. No polling or re-joining needed — it's all event-driven.

## Q: So it's like WebSocket? Bidirectional communication?

Exactly. Hyperswarm connections are **persistent TCP links** — both sides can send data anytime, like WebSocket. Once a peer connects, data flows both ways until someone disconnects.

Unlike HTTP where you poll, the DHT announces your availability and peers connect when they see you. It's event-driven, not request-response.

## Q: Does the loading spinner wait for peer sync?

No. The spinner waits for the backend startup sequence:

1. `await bee.ready()` — load local Corestore data from disk (fast, <100ms)
2. `await discovery.flushed()` — Hyperswarm finishes setting up for peer discovery
3. `notifyUI()` — read local Hyperbee and send movies to the UI

It does **not** wait for peer sync. The spinner disappears as soon as local data is sent to the UI. Sync from other peers arrives in the background and updates the list whenever a peer connects.

Waiting for sync would be bad: if no peers are online, the user would be stuck on the spinner forever. Show local data instantly, sync arrives when peers connect.
