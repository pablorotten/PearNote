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

## Q: If all peers leave a room, is the data lost? Can a peer sync later?

Yes, if you're the only peer in a room and you leave, your data is still saved **locally** on your device (in Corestore on the filesystem). It's not lost — it's just not reachable over the network.

When you re-enter the same room:
1. Corestore loads your local data and shows it immediately (no sync needed).
2. Hyperswarm re-joins the DHT topic and looks for peers.

The only way another peer can see your data is if **both of you are in the room at the same time**. If you have the data and the other peer doesn't, they sync from you when they connect.

## Q: Can't one device seed multiple rooms at the same time?

Technically yes. Each room is a separate `Worklet` instance (a Bare runtime process) with its own Corestore + Hyperswarm swarm. You could spawn multiple worklets in parallel and keep them running in the background.

The cost per idle room:
- **CPU**: Near zero — just listening for events
- **Memory**: ~5-10MB per worklet (JS runtime + Corestore index)
- **Network**: DHT re-announce every ~5-10 min per room, negligible bandwidth
- **Battery**: Comparable to keeping a WebSocket connection open per room

For 2-3 rooms it's nothing. For 30 rooms on mobile it becomes heavy:
- **150-300MB** memory just for the idle worklets
- 30 concurrent Hyperswarm topics in one process isn't well-tested on mobile
- Battery drain from keep-alive traffic

At that scale you'd want a different architecture — a single daemon multiplexing all rooms, or a desktop seed relay.

For MovieKollections as a demo: sync happens only when two users are **both in the same room at the same time**. If one leaves, the room goes offline until they return.

## Q: What happens when peers desync? Can deletions get re-introduced by stale peers?

Yes, this is a real problem in the current implementation. Scenario:

1. Peers A and B are synced with the same movie list
2. B disconnects
3. A removes some movies
4. B reconnects, loads its stale local data (still has the deleted movies)
5. B's `sendFullList` sends its stale data to A
6. The deleted movies pop back up in A's list

**Why this happens:** The current `handleSync` is purely additive:

```js
async function handleSync(movies) {
  for (const { key, value } of movies) {
    const existing = await bee.get(key)
    if (!existing) await bee.put(key, value)  // only adds, never deletes
  }
  await notifyUI()
}
```

It only adds missing items — it never removes them. And `sendFullList` sends the sending peer's data to the receiving peer (not the other way). There's no "this is the authoritative version" concept.

**Is this a fundamental P2P limitation?**

No — it's a design choice in this specific implementation. Here are ways to solve it:

- **Event log (Hypercore's natural model)**: Instead of storing the latest state (key-value in Hyperbee), store every `add` and `remove` as entries in an append-only log. On reconnect, peers replay the full event log and converge on the same final state. This is how Hypercore is designed to be used.

- **Version counter**: Each peer bumps a version number on every change. On reconnect, compare versions — the peer with the higher version wins and its full list replaces the other's.

- **Tombstones**: Store removals as explicit entries (`['tombstone', key]`). During merge, tombstones cancel out adds. Both peers converge on the same set.

- **Last-write-wins with timestamps**: Each entry has a timestamp. On merge, the newest timestamp wins for each key.

The current code uses Hyperbee (key-value store built on Hypercore) and treats deletions as "remove the key" — losing the event history. Hypercore's append-only log naturally preserves every change, which is the right tool for this problem.

## Q: How does a developer need to think about this architecture?

Forget about servers. Think of each device as a node that holds its own piece of data.

**The mindset shift:**
- No "database in the cloud" — each device has its own Corestore (append-only log) on the filesystem
- No "API calls" — peers connect directly via Hyperswarm and exchange messages over persistent TCP links
- No "server always running" — data only flows while at least two peers are in the same room simultaneously
- No "polling" — the DHT announces your presence, peers connect when they see you, everything is event-driven

**The mental model:**
```
Device A (room "1234") ←→ Hyperswarm DHT ←→ Device B (room "1234")
    │                                                 │
    ├─ Corestore (local disk)                         ├─ Corestore (local disk)
    ├─ Hyperbee (key-value)                           ├─ Hyperbee (key-value)
    └─ Worklet (Bare runtime)                         └─ Worklet (Bare runtime)
```

Both devices run identical code. There's no client/server, no master/slave. Each writes to its own Corestore and broadcasts changes. When a peer connects, they exchange their full list and merge.

**Limitations:**
- If all peers leave a room, the data is **offline** until someone re-enters
- There's no persistent storage "in the network" — only on devices
- Sync is real-time only (both peers must be connected)
- Mobile battery/memory limits how many rooms one device can seed in background
- No history or conflict resolution beyond "last write wins"

This is the pure P2P trade-off: no servers to maintain, but no guarantees either.
