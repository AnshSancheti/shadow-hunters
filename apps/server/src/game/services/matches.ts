import { nanoid } from 'nanoid';
import type { 
  MatchState, 
  PlayerState, 
  Seat,
  AreaId,
  DeckState,
  GameServerEvent
} from '@shadow-hunters/shared';
import { RNG } from '../engine/rng';
import { gameReducer, ReducerContext } from '../engine/reducer';
import { evaluateWin } from '../engine/win';
import { createClientView } from '../engine/view';
import { FACTION_DISTRIBUTION, MIN_PLAYERS, MAX_PLAYERS } from '../model/constants';
import areasData from '../data/areas.json';
import charactersData from '../data/characters.json';
import whiteCards from '../data/white.json';
import blackCards from '../data/black.json';
import hermitCards from '../data/hermit.json';

export class MatchService {
  private matches: Map<string, MatchState> = new Map();
  private matchEvents: Map<string, GameServerEvent[]> = new Map();
  private playerToMatch: Map<string, string> = new Map();

  private generateGameCode(): string {
    // Generate a 4-character uppercase code (letters only for simplicity)
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    
    // Keep generating until we find an unused code
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
    } while (this.matches.has(code));
    
    return code;
  }

  createMatch(creatorId: string, displayName: string): { matchId: string; match: MatchState } {
    // Generate a 4-character uppercase code
    const matchId = this.generateGameCode();
    const match: MatchState = {
      id: matchId,
      status: 'LOBBY',
      createdAt: Date.now(),
      seats: [0],
      turnOrder: [],
      phase: 'MOVE',
      round: 0,
      rngSeed: nanoid(),
      players: {
        0: {
          userId: creatorId,
          displayName,
          seat: 0,
          alive: true,
          hp: 0,
          revealed: false,
          characterId: '',
          equipment: [],
          position: null,
          connected: true
        }
      },
      areas: this.initializeAreas(),
      decks: {
        WHITE: { draw: [], discard: [] },
        BLACK: { draw: [], discard: [] },
        HERMIT: { draw: [], discard: [] }
      },
      piles: {
        WHITE: [],
        BLACK: [],
        HERMIT: []
      },
      eventsApplied: 0
    };

    this.matches.set(matchId, match);
    this.matchEvents.set(matchId, []);
    this.playerToMatch.set(creatorId, matchId);

    return { matchId, match };
  }

  joinMatch(matchId: string, userId: string, displayName: string): { seat: Seat; success: boolean; error?: string } {
    const match = this.matches.get(matchId);
    if (!match) {
      return { seat: -1 as Seat, success: false, error: 'Match not found' };
    }

    if (match.status !== 'LOBBY') {
      // Check for reconnection
      const existingPlayer = Object.values(match.players).find(p => p.userId === userId);
      if (existingPlayer) {
        existingPlayer.connected = true;
        return { seat: existingPlayer.seat, success: true };
      }
      return { seat: -1 as Seat, success: false, error: 'Match already started' };
    }

    if (match.seats.length >= MAX_PLAYERS) {
      return { seat: -1 as Seat, success: false, error: 'Match is full' };
    }

    const seat = match.seats.length as Seat;
    match.seats.push(seat);
    match.players[seat] = {
      userId,
      displayName,
      seat,
      alive: true,
      hp: 0,
      revealed: false,
      characterId: '',
      equipment: [],
      position: null,
      connected: true
    };

    this.playerToMatch.set(userId, matchId);
    return { seat, success: true };
  }

  startMatch(matchId: string): { success: boolean; error?: string } {
    const match = this.matches.get(matchId);
    if (!match) {
      return { success: false, error: 'Match not found' };
    }

    if (match.status !== 'LOBBY') {
      return { success: false, error: 'Match already started' };
    }

    if (match.seats.length < MIN_PLAYERS) {
      return { success: false, error: `Need at least ${MIN_PLAYERS} players` };
    }

    // Initialize game state
    const rng = new RNG(match.rngSeed);
    
    // Shuffle and assign characters
    this.assignCharacters(match, rng);
    
    // Initialize decks
    this.initializeDecks(match, rng);
    
    // Set turn order
    match.turnOrder = rng.shuffle([...match.seats]);
    match.activeSeat = match.turnOrder[0];
    
    // Players start outside any location (null position)
    
    match.status = 'ACTIVE';
    match.startedAt = Date.now();
    match.round = 1;
    
    return { success: true };
  }

  processCommand(matchId: string, userId: string, command: any): GameServerEvent[] {
    const match = this.matches.get(matchId);
    if (!match) {
      return [{
        id: nanoid(),
        timestamp: Date.now(),
        type: 'ERROR',
        data: { code: 'MATCH_NOT_FOUND', message: 'Match not found' }
      }];
    }

    // Find player seat
    const player = Object.values(match.players).find(p => p.userId === userId);
    if (!player) {
      return [{
        id: nanoid(),
        timestamp: Date.now(),
        type: 'ERROR',
        data: { code: 'NOT_IN_MATCH', message: 'You are not in this match' }
      }];
    }

    // Process command through reducer
    const rng = new RNG(match.rngSeed + match.eventsApplied);
    const context: ReducerContext = {
      state: match,
      rng,
      timestamp: Date.now()
    };

    const events = gameReducer(context, command);
    
    // Apply events to state
    this.applyEvents(match, events);
    
    // Check win conditions after state update
    const winResult = evaluateWin(match);
    if (winResult) {
      match.winners = winResult.winners;
      match.winningFaction = winResult.faction;
      match.status = 'ENDED';
      match.endedAt = Date.now();
      
      events.push({
        id: nanoid(),
        timestamp: Date.now(),
        type: 'GAME_ENDED',
        data: winResult
      });
    }
    
    // Store events
    const matchEvents = this.matchEvents.get(matchId) || [];
    matchEvents.push(...events);
    this.matchEvents.set(matchId, matchEvents);
    
    return events;
  }

  getMatch(matchId: string): MatchState | undefined {
    return this.matches.get(matchId);
  }

  getClientView(matchId: string, viewerSeat?: Seat) {
    const match = this.matches.get(matchId);
    if (!match) return null;
    return createClientView(match, viewerSeat);
  }

  private initializeAreas() {
    const areas: any = {};
    for (const area of areasData.areas) {
      areas[area.id] = area;
    }
    return areas;
  }

  private assignCharacters(match: MatchState, rng: RNG) {
    const playerCount = match.seats.length;
    const distribution = FACTION_DISTRIBUTION[playerCount as keyof typeof FACTION_DISTRIBUTION];
    
    if (!distribution) {
      console.error(`No faction distribution defined for ${playerCount} players`);
      return;
    }
    
    const hunters = charactersData.characters.filter(c => c.faction === 'HUNTER');
    const shadows = charactersData.characters.filter(c => c.faction === 'SHADOW');
    const neutrals = charactersData.characters.filter(c => c.faction === 'NEUTRAL');
    
    const selectedCharacters = [
      ...rng.choices(hunters, distribution.hunters),
      ...rng.choices(shadows, distribution.shadows),
      ...rng.choices(neutrals, distribution.neutrals)
    ];
    
    const shuffledCharacters = rng.shuffle(selectedCharacters);
    
    match.seats.forEach((seat, index) => {
      const character = shuffledCharacters[index];
      match.players[seat].characterId = character.id;
      match.players[seat].hp = character.maxHp;
    });
  }

  private initializeDecks(match: MatchState, rng: RNG) {
    match.decks.WHITE.draw = rng.shuffle(whiteCards.cards.map(c => c.id));
    match.decks.BLACK.draw = rng.shuffle(blackCards.cards.map(c => c.id));
    match.decks.HERMIT.draw = rng.shuffle(hermitCards.cards.map(c => c.id));
  }

  private applyEvents(match: MatchState, events: GameServerEvent[]) {
    for (const event of events) {
      switch (event.type) {
        case 'PLAYER_MOVED':
          match.players[event.data.seat].position = event.data.to;
          break;
        
        case 'DICE_ROLLED':
          match.lastDiceRoll = event.data.roll;
          match.pendingAreaChoice = event.data.mustChooseArea;
          break;
        
        case 'PHASE_CHANGED':
          match.phase = event.data.to;
          break;
        
        case 'TURN_STARTED':
          match.activeSeat = event.data.seat;
          match.round = event.data.round;
          match.phase = event.data.phase;
          break;
        
        case 'ATTACK_RESOLVED':
          match.players[event.data.target].hp = event.data.targetHp;
          break;
        
        case 'PLAYER_HEALED':
          match.players[event.data.seat].hp = event.data.newHp;
          break;
        
        case 'PLAYER_DAMAGED':
          match.players[event.data.seat].hp = event.data.newHp;
          break;
        
        case 'PLAYER_DIED':
          match.players[event.data.seat].alive = false;
          break;
        
        case 'PLAYER_REVEALED':
          match.players[event.data.seat].revealed = true;
          break;
        
        case 'HERMIT_GIVEN':
          match.hermitDelivery = {
            from: event.data.from,
            to: event.data.to,
            cardId: ''
          };
          break;
      }
      
      match.eventsApplied++;
    }
  }
}