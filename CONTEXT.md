# MovieKollections Project Plan

## 🎯 Project Goal

Create a **desktop/mobile app** that demonstrates P2P (peer-to-peer) movie list sharing using the **Pear framework** from Holepunch. This is primarily for creating a **video tutorial showcasing how Pear works**.

### Key User Flow
1. User enters their TMDB API key (manual, stored locally)
2. User searches for movies via TMDB API
3. User creates movie lists (favorites, watchlist, etc.)
4. **P2P Magic**: User generates a "pairing code" (discovery key)
5. Second device enters the pairing code
6. Lists automatically sync between devices **without a server**

---

## 🔧 Technical Stack

### Confirmed
- **Pear Runtime**: High-level P2P framework wrapping Hypercore + Hyperswarm
- **Bare Runtime**: Lightweight JavaScript runtime (alternative to Node.js)
- **Hypercore**: Append-only cryptographic log for data replication
- **Hyperswarm**: P2P networking protocol for peer discovery
- **TMDB API**: Movie metadata (titles, posters, descriptions)

### To Be Determined
- UI Framework: React? Vanilla JS? Pear native components?
- Build tooling: Does `pear build` exist? Separate configs per platform?
- State management: Local storage? Hypercore-backed DB?

---

## ❓ Open Questions (Need Investigation)

### 1. Mobile Support ⚠️ **CRITICAL BLOCKER**
**Question**: Can Pear build Android APKs and iOS apps?

**What We Know**:
- Pear documentation claims "Desktop/Mobile/CLI" support
- Holepunch has `bare-native` for OS integration (including Android/iOS)

**What We DON'T Know**:
- Is mobile support production-ready or experimental?
- Does `pear build --platform=android` work?
- Are there mobile examples/templates?

**Action**: After `pear init`, check:
```bash
pear --help | grep -i "android\|mobile\|platform"
# Look for build commands, mobile templates, or platform flags
```

### 2. Cross-Platform Code Sharing
**Question**: One codebase or separate projects for desktop/mobile?

**Best Guess**: One codebase with:
- 80% shared logic (P2P sync, TMDB API, data models)
- 20% platform-specific UI (desktop vs mobile layouts)

**Action**: Check `pear init` output for platform detection patterns

### 3. UI Layer
**Question**: What UI framework does Pear use?

**Options**:
- Pear native components (like React Native)
- Standard web tech (HTML/CSS/JS) with platform-specific layouts
- Bring your own (React, Vue, Svelte)

**Action**: See what `pear init` generates

---

## 📋 Investigation Plan

### Phase 1: Pear Capability Assessment (Now)
```bash
# In new movieKollections repo
npm install -g pear
pear --help                    # Check available commands
pear init .                    # Generate starter project
ls -la                         # See project structure
cat package.json               # Check dependencies
cat pear.json                  # Check Pear config (if exists)
```

**Deliverables**:
- Confirm mobile build capability (yes/no)
- Understand project structure
- Document findings in a skill file

### Phase 2: Architecture Design
Based on Phase 1 findings:
- **If mobile works**: Plan cross-platform architecture
- **If desktop only**: Plan Electron-style desktop app

**Key Decisions**:
- UI framework choice
- Data persistence strategy (Hypercore vs localStorage)
- Sync protocol (how two devices find each other)

### Phase 3: Implementation
1. Basic TMDB search (reuse Movie Kombat code)
2. Local list management
3. P2P sync implementation
4. Pairing code generation/entry
5. Multi-device testing

### Phase 4: Video Demo
Record tutorial showing:
- App creation from scratch
- P2P sync explanation
- Live 2-device demo

---

## 🔄 Code Reusable from Movie Kombat

### Can Reuse (Adapt to Pear)
- ✅ `src/services/tmdbService.ts` — TMDB API calls
- ✅ `src/types.tsx` — Movie, SavedList types
- ✅ `src/assets/TMDB/genres.json` — Genre metadata
- ✅ `src/assets/TMDB/providers.json` — Streaming providers
- ✅ `src/utils/genreUtils.ts` — Genre mapping logic
- ✅ List CRUD logic patterns (from `listPersistenceService.ts`)

### Cannot Reuse (Web-Specific)
- ❌ React components (Pear might not use React)
- ❌ Vite build config (Pear has its own build system)
- ❌ Vercel Functions (no server in P2P architecture)
- ❌ React Router (Pear likely has different navigation)
- ❌ localStorage (might use Hypercore instead)

---

## 🎬 Video Tutorial Outline (Draft)

1. **Intro** (2 min)
   - Problem: Centralized app servers = privacy issues, downtime
   - Solution: P2P with Pear = serverless, private, resilient

2. **How Pear Works** (3 min)
   - Holepunch ecosystem overview
   - Hypercore (data), Hyperswarm (networking), Pear (framework)
   - NAT traversal / hole punching explanation

3. **Building MovieKollections** (10 min)
   - `pear init` walkthrough
   - TMDB integration
   - List management
   - P2P sync implementation

4. **Live Demo** (5 min)
   - Device 1: Create list, generate pairing code
   - Device 2: Enter code, see list sync
   - Add movie on Device 2 → syncs to Device 1
   - Disconnect internet → still works locally

5. **Wrap-up** (2 min)
   - When to use P2P vs traditional client-server
   - Resources / docs
   - Call to action

---

## 🚧 Current Status

**In Movie Kombat**:
- ✅ Phase 2 complete (My Movie Lists feature)
- ✅ All 164 tests passing
- ✅ Ready for production deployment
- ⏸️ Paused — switching focus to MovieKollections

**Next Steps**:
1. Create `movieKollections` repo
2. Install Pear CLI globally
3. Run investigation commands
4. Share findings → decide architecture
5. Start implementation

---

## 💡 Success Criteria

**Minimum Viable Demo**:
- ✅ Desktop app that runs on Windows/macOS/Linux
- ✅ TMDB search working
- ✅ Create/edit/delete lists
- ✅ Two instances sync over LAN
- ✅ Pairing code system

**Stretch Goals** (if mobile works):
- ✅ Android APK build
- ✅ Desktop ↔ Mobile sync
- ✅ iOS build (if time permits)

---

## 📞 Questions for Next Chat

When you start the new chat, please share:
1. Output of `pear --help`
2. Output of `pear init .`
3. Contents of generated `package.json` / `pear.json`
4. Project structure (`ls -la` or `tree`)

This will tell us **exactly** what Pear can do and unlock the architecture planning phase.

---

**Ready to investigate? Create the repo, run those commands, and let's discover what Pear can really do! 🚀**
