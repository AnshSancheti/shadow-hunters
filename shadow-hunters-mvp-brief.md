# Shadow Hunters — Online MVP Build Brief (paste into your agentic code tool)

**Goal:** Implement a web-playable MVP of *Shadow Hunters* that supports online multiplayer and plays like the tabletop base game. Focus on correctness of the turn loop, hidden information, decks, movement, attacking, reveals, and win checks. Keep it simple, server‑authoritative, and shippable.

## Scope (MVP)
- 4–8 players per room (base game only).
- Hidden roles (Shadow / Hunter / Neutral) assigned at start.
- Turn order; per-turn phases: **Move → Area Action (optional) → Attack (optional) → End Turn**.
- Area movement by dice(d6 + d4); range pairing enforced.
- Decks: **White**, **Black**, **Hermit** (draw, discard, reshuffle).
- Attacks with **|d6 − d4|** damage; **doubles = miss**.
- Equipment is always-on (no toggling) unless a card explicitly says otherwise.
- Hermit flow: draw secretly, deliver facedown to a chosen player; that player resolves privately; public deltas (HP, reveal) are broadcast.
- Character reveals & ability timing windows (skeleton hooks in MVP; most abilities can be filled later via data-driven registry).
- Instant win checks after every state change.
- Reconnect/resync for dropped clients.
- No bots, no MMR, no replays (stretch), no cosmetics—yet.


## Architecture (Monorepo)
**Tech choices (keep these unless you know better):**
- **Backend:** Node 20+, TypeScript, Fastify, Socket.IO (WebSocket), Zod for validation, NanoID for ids.
- **State:** Pure reducers + event sourcing (append-only log) with periodic snapshotting (in-memory for MVP).
- **Frontend:** React 18 + TypeScript + Vite; Zustand for client state; Socket.IO client.
- **Tests:** Vitest.
- **Package manager:** npm.

**Folder layout recommendation:**
```
shadow-hunters-online/
  package.json
  tsconfig.json
  apps/
    server/
      src/
        index.ts
        ws.ts
        game/
          engine/
            reducer.ts
            validators.ts
            rng.ts
            win.ts
            view.ts
            fsm.ts
          model/
            types.ts
            constants.ts
          data/
            areas.json
            characters.json
            white.json
            black.json
            hermit.json
          services/
            matches.ts
            lobby.ts
          test/
            engine.spec.ts
    client/
      index.html
      src/
        main.tsx
        api/socket.ts
        state/store.ts
        pages/Lobby.tsx
        pages/Table.tsx
        ui/*
        types.ts (shared client view types)
  packages/
    shared/
      src/
        messages.ts (Command/Event enums & payload zod schemas)
        types.ts (shared types)
```


## Data Model (shared `types.ts`)
Use these as your source of truth; refine as needed, but keep semantics.

```ts
export type Seat = number; // 0..N-1
export type Faction = 'HUNTER' | 'SHADOW' | 'NEUTRAL';

export interface CharacterDef {
  id: string;
  name: string;
  faction: Faction;
  maxHp: number;
  // Optional data-driven ability hooks (timings described below)
  abilities?: AbilitySpec[];
}

export interface PlayerState {
  userId: string;
  seat: Seat;
  alive: boolean;
  hp: number;
  revealed: boolean;
  characterId?: string; // hidden until revealed
  equipment: CardDef[];  // card ids from white/black decks tagged as equipment
  position: AreaId;
}

export type AreaId = 'UNDERWORLD_GATE' | 'CHURCH' | 'HERMIT_CABIN' | 'CEMETERY' | 'WEIRD_WOODS' | 'ERSTWHILE_ALTAR';
// NOTE: pair ranges: [UNDERWORLD_GATE+CHURCH], [HERMIT_CABIN+CEMETERY], [WEIRD_WOODS+ERSTWHILE_ALTAR]

export interface AreaDef {
  id: AreaId;
  range: [number, number]; // inclusive dice total range (2..12); 7 = special “choose other area” behavior
  action: AreaActionSpec;  // declarative spec (draw deck X, heal, damage, steal, etc.)
}

export interface DeckState {
  draw: string[];    // top at end
  discard: string[]; // top at end
}

export interface CardDef {
  id: string;
  name: string;
  deck: 'WHITE' | 'BLACK' | 'HERMIT';
  kind: 'EQUIPMENT' | 'SINGLE-USE' ;
  text?: string; // user-facing
  // Declarative effect to enable engine execution without switch-cases
  effect?: EffectSpec;
}

export interface MatchState {
  id: string;
  status: 'LOBBY' | 'ACTIVE' | 'ENDED';
  seats: Seat[];
  turnOrder: Seat[];
  activeSeat: Seat;
  phase: 'MOVE' | 'AREA' | 'ATTACK' | 'END';
  round: number;
  rngSeed: string;
  players: Record<Seat, PlayerState>;
  areas: Record<AreaId, AreaDef>;
  decks: {
    WHITE: DeckState; BLACK: DeckState; HERMIT: DeckState;
  };
  piles: { // revealed/discarded cards visible to all
    WHITE: string[]; BLACK: string[]; HERMIT: string[];
  };
  eventsApplied: number; // last event index for resync
  winners?: Seat[];
}
```


## Turn & Phase FSM (`fsm.ts`)
- **MOVE (mandatory):**
  - Server rolls d6 and d4 → sum.
  - If sum == 7: player must choose **any other** area (not current).
  - Else: move to the area whose range includes sum. If already there, **reroll**.
  - Emit `MOVED` event (include dice values).

- **AREA (optional):**
  - If the area has an action, player may choose to use it or skip.
  - Supported actions (MVP):
    - Draw from White / Black / Hermit.
    - Weird Woods: heal any player +1 **or** deal 2 damage to any one player.
    - Erstwhile Altar: steal one equipment from a player in your area or paired area (if exists).
    - Church: draw White.
    - Cemetery: draw Black.
    - Hermit Cabin: draw Hermit and **deliver facedown** to a chosen player; they resolve privately.
  - Emit `AREA_ACTION_*` events accordingly.

- **ATTACK (optional):**
  - Legal targets: any player in your **current area** or its **paired area**.
  - Damage = `abs(d6 - d4)`; if `d6 == d4`, damage = 0 (miss).
  - Apply damage; handle on-death triggers & loot per rules (simplify to: loot one random equipment from each killed player; leave scaffold to extend exact rule later).
  - Emit `ATTACK_RESOLVED` and `CHAR_DEAD` (if any).

- **END:**
  - Advance to next living seat in `turnOrder`.
  - `round++` after cycling all seats once.
  - Emit `TURN_STARTED`.

- **Win Checks:**
  - After **every** event batch (move/area/attack/reveal/loot), run `evaluateWin(state)`.
  - For MVP: check faction win conditions:
    - **Hunters** win if all Shadows are dead.
    - **Shadows** win if Hunters are dead or equal/outnumber (implement basic version; refine later).
    - **Neutrals**: add two example neutrals with simple conditions (e.g., survive to end / die first); make hooks to extend more later.
  - If win, emit `GAME_ENDED`.


## Events, Commands & Validation
Use Zod schemas in `packages/shared/messages.ts` and reuse on server & client.

**Client → Server Commands (subset):**
```ts
JOIN_MATCH { matchId: string, displayName: string }
START_GAME { matchId: string }
ROLL_AND_MOVE { } // server rolls; client only triggers intent
CHOOSE_AREA { areaId: AreaId } // when sum==7
DO_AREA_ACTION { action: AreaActionChoice } // e.g. DRAW_WHITE | DRAW_BLACK | HERMIT_TO:{seat}
ATTACK { targetSeat: Seat }
END_TURN { }
REVEAL_IDENTITY { } // optional
USE_ABILITY { abilityId: string, params?: any } // scaffolded
```

**Server → Client Events:**
```ts
STATE_SYNC { view: ClientView, lastEvent: number }
MATCH_STARTED { seats: Seat[], you: Seat, areas: AreaDef[] }
TURN_STARTED { seat: Seat, round: number }
ROLLED { seat: Seat, d6: number, d4: number, sum: number }
MOVED { seat: Seat, to: AreaId }
AREA_ACTION_PROMPT { seat: Seat, options: AreaActionChoice[] }
DREW_CARD_PUBLIC { seat: Seat, deck: 'WHITE'|'BLACK', cardName: string }
GAVE_HERMIT { from: Seat, to: Seat } // contents never revealed publicly
HERMIT_RESOLVED_PUBLIC { to: Seat, publicDeltas: Deltas }
ATTACK_RESOLVED { from: Seat, results: { to: Seat, d6: number, d4: number, damage: number }[] }
REVEALED { seat: Seat, characterName: string, faction: Faction }
CHAR_DEAD { seat: Seat, loot?: string[] }
GAME_ENDED { winners: Seat[], faction?: Faction }
ERROR { code: string, message: string }
```

**Per-Player View Filter (`view.ts`):**
- Hide other players’ characterId unless revealed.
- Hide Hermit contents and any secret draws.
- Show all public deltas (HP, deaths, equipment if rules say public).


## Engine (`reducer.ts` & `validators.ts`)
- Reducer is **pure**: `(state, command) -> Event[]`; a separate applier mutates state via events.
- Strict validation of:
  - Turn ownership, phase gating.
  - Legal targets (area/paired area).
  - Deck availability (reshuffle discard into draw if empty).
  - HP bounds and death processing.
- RNG is server-side only (`rng.ts`): Xoroshiro128+ seeded per match; export `rollD6()`, `rollD4()`, and `shuffle<T>()`.
- After applying each event batch, run `win.ts::evaluateWin` and possibly short‑circuit the turn.


## Data-Driven Rules (`data/*.json`)
Create minimal seeds to be correct “enough” for MVP; expand later without changing engine code.

- `areas.json` — six areas with ranges & declarative actions.
- `white.json`, `black.json`, `hermit.json` — a handful of representative cards each:
  - **White**: healing, protection, light equipment.
  - **Black**: damage, heavy equipment.
  - **Hermit**: identity-conditional nudges (heal if Hunter, reveal if Shadow, etc.).
- `characters.json` — base set:
  - Provide a few Hunters, Shadows, and at least two Neutrals with simple win hooks.
  - Include `maxHp` and ability tags (even if unimplemented).


## WebSocket Server (`ws.ts`)
- Socket.IO namespace `/match/:id` with room join.
- On connect, send `STATE_SYNC` (server-sourced view).
- Process commands in order; ignore duplicates by client action id (optional for MVP).
- On disconnect, mark player as disconnected; keep seat reserved for 2 minutes; allow reconnect by `userId` token.


## HTTP (Fastify, minimal)
- `POST /match` → create lobby (returns `matchId`).
- `POST /match/:id/join` → get socket token, seat assignment (or spectate).
- **MVP note:** Keep all state in-memory; store nothing durable beyond process lifetime.


## Client (React)
- **Lobby.tsx**: create/join match; list seats; ready state; start game.
- **Table.tsx**: show six areas in two paired rows; show your hand (if any), equipment, HP; others’ HP/equipment (as allowed), reveal badges.
- **Action rail** showing legal actions for current phase:
  - Move (server prompts you if 7 to choose area).
  - Area action choices.
  - Attack target selection (area + paired area only).
  - End turn.
- **Dice panel** driven by server numbers (animate but never compute client-side).
- **Log pane** (human-readable digest of events).


## Ability Hooks (scaffold only)
Define standard timing hooks that card effects/abilities may register for later:
- `onBeforeMove`, `onAfterMove`
- `onBeforeAreaAction`, `onAfterAreaAction`
- `onBeforeAttack`, `onAttackRoll`, `onDamageApply`, `onAfterAttack`
- `onBeforeReveal`, `onAfterReveal`, `onDeath`
Implement a **no-op handler** table now; wire one or two simple examples.


## Testing (Vitest)
- Unit-test reducer paths:
  - Movement (incl. `7` choose-other, reroll-if-same-area).
  - Area actions (draws, Weird Woods heal/damage, Hermit delivery + private resolution with public deltas).
  - Attack math (difference, doubles miss, multi-target if you include such a card).
  - Death processing & simple loot.
  - Win evaluation for each faction.
- Property tests:
  - Deck conservation (draw + discard + reshuffle == full set).
  - HP in [0..maxHp].
  - No illegal targets outside area/paired area.


## Developer Experience
- `npm run dev` — run server & client concurrently.
- Hot reload for client; server restarts on change (nodemon / tsx).
- ESLint + Prettier sane defaults.


## Tasks Checklist (in build order)
1. **Scaffold monorepo**; install deps.
2. **Shared types & message schemas**.
3. **Engine reducer + RNG + validators + win checks**.
4. **In-memory match service & WebSocket wiring**.
5. **Frontend lobby + table UI** with action rail and log.
6. **Area + attack flows** end-to-end (happy path).
7. **Hermit flow** with private resolution and public deltas.
8. **Reconnection → STATE_SYNC** from snapshot.
9. **Tests for core rules**.
10. **Polish** (dice animations, little sounds) — optional.

Stretch (post-MVP, ignore if time-boxed):
- Persist events/snapshots; replays.
- Commit–reveal RNG transparency.
- Admin console.
- Full character/ability set parity.


## Non-Goals (MVP)
- No AI bots, no ranked play, no i18n, no mobile-native app, no external DB.
- No exotic ability corner cases unless trivial.
- No account system (use displayName + ephemeral id).


## Acceptance Criteria
- Two browsers can join the same match, start game, take turns, move, optionally do area actions, attack, reveal, die, and trigger a win condition—**without desync**.
- Hidden info stays hidden. Server is authoritative. A reconnecting player gets a correct filtered state.
- Dice and shuffles are server-driven and reproducible from a seed (visible in server logs).


## Notes to the Agent
- Favor **data-driven** effects so parity with the board game is a content job, not an engine rewrite.
- Keep the reducer **pure**; writing to sockets or timers must happen in orchestrator code.
- Be strict with validation—illegal actions should return a friendly `ERROR` event and not mutate state.
- Sprinkle comments explaining corner cases (future-you will high-five present-you).

---

### Quick Start (expected dev scripts)
- `npm i`
- `npm run dev` → concurrently start `apps/server` (port 8787) and `apps/client` (port 5173).
- Open `http://localhost:5173`, create a match, open a second tab, join, and play.
