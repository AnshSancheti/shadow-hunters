# Shadow Hunters Online MVP

A web-based multiplayer implementation of the Shadow Hunters board game.

## Quick Start

### Install dependencies
```bash
npm install
```

### Run development servers
```bash
npm run dev
```

This will start:
- Server on http://localhost:8787
- Client on http://localhost:5173

## How to Play

1. Open http://localhost:5173 in your browser
2. Create a new game or join with a game code
3. Wait for 4-8 players to join
4. Host starts the game
5. Take turns moving, using area actions, and attacking
6. Win by achieving your faction's victory condition

## Game Rules

### Factions
- **Hunters**: Win by eliminating all Shadows
- **Shadows**: Win by eliminating Hunters or equal/outnumber them  
- **Neutrals**: Each has unique win conditions

### Turn Structure
1. **Move Phase**: Roll dice and move to the corresponding area (7 = choose any)
2. **Area Action Phase**: Optionally use the area's action
3. **Attack Phase**: Optionally attack players in your area or paired area
4. **End Turn**: Pass to next player

### Combat
- Roll 2 dice (d6 and d4)
- Damage = |d6 - d4|
- If dice match (doubles), attack misses

## Architecture

- **Monorepo** structure with shared types
- **Server**: Node.js, TypeScript, Fastify, Socket.IO
- **Client**: React, TypeScript, Vite, Zustand
- **Game Engine**: Pure reducers with event sourcing
- **State Management**: Server-authoritative with client views

## Development

### Project Structure
```
shadow-hunters/
├── apps/
│   ├── server/    # Game server
│   └── client/    # React client
├── packages/
│   └── shared/    # Shared types and schemas
└── package.json   # Root workspace
```

### Key Features
- Hidden role system with faction-based gameplay
- Real-time multiplayer via WebSockets
- Dice-based movement and combat
- Area actions and card effects
- Win condition evaluation
- Reconnection support