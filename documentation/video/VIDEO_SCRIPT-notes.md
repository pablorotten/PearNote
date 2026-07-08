| Component | Analogy for server-side devs |
| --- | --- |
| Hypercore | "Like a .log file or a database table that only supports INSERT, never UPDATE or DELETE — and it replicates itself P2P like a torrent" |
| Corestore | "Like a DataSource / connection pool — you configure it once with a folder and a master key, then your app asks it for individual Hypercores without managing them manually" |
| Bare | "Node.js running on your phone instead of a server" |
| Autopass | "Like a shared Google Keep with no server — any device with an invite code joins, edits sync automatically, and conflicts resolve themselves" |

The Hypercore one I'd keep your instinct: start with "it's our database" for the non-technical crowd, then immediately caveat "but think .log file, not SQL — append-only, no edits, no deletes."