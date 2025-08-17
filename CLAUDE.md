# Shadow Hunters Online - Project Documentation

## Overview
This is a web-based multiplayer implementation of the Shadow Hunters board game, built with TypeScript, Node.js, React, and Socket.IO.

## Architecture
- **Monorepo** structure with npm workspaces
- **Server-authoritative** game logic with event sourcing
- **Real-time multiplayer** via WebSockets
- **Type-safe** throughout with TypeScript and Zod validation

## Project Structure
```
shadow-hunters/
├── apps/
│   ├── server/          # Game server (Fastify, Socket.IO)
│   └── client/          # React client (Vite, Zustand)
├── packages/
│   └── shared/          # Shared types and message schemas
└── package.json         # Root workspace configuration
```

## Key Components

### Server (`apps/server/`)
- **Game Engine**: Pure reducer functions with event sourcing
- **RNG Module**: Deterministic random with Xoroshiro128+
- **Match Service**: In-memory game state management
- **WebSocket Server**: Real-time communication with Socket.IO
- **HTTP API**: Fastify for match creation/joining

### Client (`apps/client/`)
- **React + Vite**: Fast development and build
- **Zustand**: Client state management
- **Socket.IO Client**: Real-time server communication
- **Game UI**: Lobby, game board, action rail, dice panel

### Shared (`packages/shared/`)
- **Types**: Common TypeScript interfaces
- **Messages**: Zod schemas for client-server communication
- **Constants**: Game rules and configuration

## Game Features
- 4-8 player matches
- Three factions (Hunter, Shadow, Neutral) with unique win conditions
- Turn-based gameplay with phases: Move → Area Action → Attack → End
- Dice-based movement and combat
- Hidden role system with strategic reveals
- Area actions and card effects
- Real-time synchronization across all players

## Development Commands
```bash
# Install dependencies
npm install

# Start development servers (both client and server)
npm run dev

# Build all packages
npm run build

# Run tests
npm run test
```

## Server Endpoints
- `POST /match` - Create new match
- `POST /match/:id/join` - Join existing match
- WebSocket events for real-time gameplay

## Recent Updates & Fixes
- **Players Start Outside Board**: All players begin with `position: null` and must roll dice to enter
- **Attack Phase Flexibility**: Players can attack multiple times or end turn after any attack  
- **Personalized Views**: Each player sees their own "You" label correctly via personalized Socket.IO messages
- **4-Character Game Codes**: Simplified from 8-character nanoid to 4-letter codes
- **Testing Mode**: MIN_PLAYERS set to 1 for easier development testing

## Known Considerations
- Currently uses in-memory storage (no persistence)
- Character abilities are scaffolded but not fully implemented
- Card effects need full implementation
- No matchmaking or ranking system yet

## Future Enhancements
- Persistent storage with database
- Full character ability implementation
- Complete card effect system
- Replay system
- Matchmaking and rankings
- Mobile responsive design
- Sound effects and animations