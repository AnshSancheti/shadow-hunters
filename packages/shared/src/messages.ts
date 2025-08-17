import { z } from 'zod';
import type { AreaId, Seat, Faction, DiceRoll, ClientView } from './types';

// Client -> Server Commands
export const CommandSchema = {
  JOIN_MATCH: z.object({
    type: z.literal('JOIN_MATCH'),
    matchId: z.string(),
    displayName: z.string().min(1).max(20),
    userId: z.string().optional(),
  }),

  CREATE_MATCH: z.object({
    type: z.literal('CREATE_MATCH'),
    displayName: z.string().min(1).max(20),
  }),

  START_GAME: z.object({
    type: z.literal('START_GAME'),
    matchId: z.string(),
  }),

  ROLL_AND_MOVE: z.object({
    type: z.literal('ROLL_AND_MOVE'),
  }),

  CHOOSE_AREA: z.object({
    type: z.literal('CHOOSE_AREA'),
    areaId: z.enum(['UNDERWORLD_GATE', 'CHURCH', 'HERMIT_CABIN', 'CEMETERY', 'WEIRD_WOODS', 'ERSTWHILE_ALTAR']),
  }),

  DO_AREA_ACTION: z.object({
    type: z.literal('DO_AREA_ACTION'),
    action: z.union([
      z.object({ type: z.literal('DRAW_WHITE') }),
      z.object({ type: z.literal('DRAW_BLACK') }),
      z.object({ type: z.literal('DRAW_HERMIT'), targetSeat: z.number() }),
      z.object({ type: z.literal('HEAL'), targetSeat: z.number(), amount: z.number() }),
      z.object({ type: z.literal('DAMAGE'), targetSeat: z.number(), amount: z.number() }),
      z.object({ type: z.literal('STEAL_EQUIPMENT'), targetSeat: z.number(), equipmentId: z.string() }),
      z.object({ type: z.literal('SKIP') }),
    ]),
  }),

  RESOLVE_HERMIT: z.object({
    type: z.literal('RESOLVE_HERMIT'),
    cardId: z.string(),
    choice: z.any(),
  }),

  ATTACK: z.object({
    type: z.literal('ATTACK'),
    targetSeat: z.number(),
  }),

  END_TURN: z.object({
    type: z.literal('END_TURN'),
  }),

  REVEAL_IDENTITY: z.object({
    type: z.literal('REVEAL_IDENTITY'),
  }),

  USE_ABILITY: z.object({
    type: z.literal('USE_ABILITY'),
    abilityId: z.string(),
    params: z.any().optional(),
  }),

  PLAY_CARD: z.object({
    type: z.literal('PLAY_CARD'),
    cardId: z.string(),
    targetSeat: z.number().optional(),
  }),
};

export type Command = 
  | z.infer<typeof CommandSchema.JOIN_MATCH>
  | z.infer<typeof CommandSchema.CREATE_MATCH>
  | z.infer<typeof CommandSchema.START_GAME>
  | z.infer<typeof CommandSchema.ROLL_AND_MOVE>
  | z.infer<typeof CommandSchema.CHOOSE_AREA>
  | z.infer<typeof CommandSchema.DO_AREA_ACTION>
  | z.infer<typeof CommandSchema.RESOLVE_HERMIT>
  | z.infer<typeof CommandSchema.ATTACK>
  | z.infer<typeof CommandSchema.END_TURN>
  | z.infer<typeof CommandSchema.REVEAL_IDENTITY>
  | z.infer<typeof CommandSchema.USE_ABILITY>
  | z.infer<typeof CommandSchema.PLAY_CARD>;

// Server -> Client Events
export interface ServerEvent {
  id: string;
  timestamp: number;
  type: string;
  data: any;
}

export interface StateSync extends ServerEvent {
  type: 'STATE_SYNC';
  data: {
    view: ClientView;
    lastEvent: number;
  };
}

export interface MatchCreated extends ServerEvent {
  type: 'MATCH_CREATED';
  data: {
    matchId: string;
    creatorSeat: Seat;
  };
}

export interface PlayerJoined extends ServerEvent {
  type: 'PLAYER_JOINED';
  data: {
    seat: Seat;
    displayName: string;
    isYou: boolean;
  };
}

export interface PlayerLeft extends ServerEvent {
  type: 'PLAYER_LEFT';
  data: {
    seat: Seat;
  };
}

export interface MatchStarted extends ServerEvent {
  type: 'MATCH_STARTED';
  data: {
    seats: Seat[];
    yourSeat: Seat;
    yourCharacter: {
      name: string;
      faction: Faction;
      maxHp: number;
    };
  };
}

export interface TurnStarted extends ServerEvent {
  type: 'TURN_STARTED';
  data: {
    seat: Seat;
    round: number;
    phase: string;
  };
}

export interface DiceRolled extends ServerEvent {
  type: 'DICE_ROLLED';
  data: {
    seat: Seat;
    roll: DiceRoll;
    mustChooseArea: boolean;
  };
}

export interface PlayerMoved extends ServerEvent {
  type: 'PLAYER_MOVED';
  data: {
    seat: Seat;
    from: AreaId;
    to: AreaId;
  };
}

export interface AreaActionPrompt extends ServerEvent {
  type: 'AREA_ACTION_PROMPT';
  data: {
    seat: Seat;
    area: AreaId;
    options: Array<{ type: string; description: string }>;
  };
}

export interface CardDrawn extends ServerEvent {
  type: 'CARD_DRAWN';
  data: {
    seat: Seat;
    deck: 'WHITE' | 'BLACK';
    cardName?: string;
    isYou: boolean;
    card?: any;
  };
}

export interface HermitGiven extends ServerEvent {
  type: 'HERMIT_GIVEN';
  data: {
    from: Seat;
    to: Seat;
  };
}

export interface HermitReceived extends ServerEvent {
  type: 'HERMIT_RECEIVED';
  data: {
    from: Seat;
    card: any;
  };
}

export interface HermitResolved extends ServerEvent {
  type: 'HERMIT_RESOLVED';
  data: {
    seat: Seat;
    publicEffects: Array<{
      type: string;
      value: any;
    }>;
  };
}

export interface AttackResolved extends ServerEvent {
  type: 'ATTACK_RESOLVED';
  data: {
    attacker: Seat;
    target: Seat;
    roll: DiceRoll;
    damage: number;
    targetHp: number;
    killed: boolean;
  };
}

export interface PlayerRevealed extends ServerEvent {
  type: 'PLAYER_REVEALED';
  data: {
    seat: Seat;
    characterName: string;
    faction: Faction;
  };
}

export interface PlayerDied extends ServerEvent {
  type: 'PLAYER_DIED';
  data: {
    seat: Seat;
    killedBy?: Seat;
    lootedEquipment?: string[];
  };
}

export interface CardPlayed extends ServerEvent {
  type: 'CARD_PLAYED';
  data: {
    seat: Seat;
    cardName: string;
    targetSeat?: Seat;
    effect: string;
  };
}

export interface PhaseChanged extends ServerEvent {
  type: 'PHASE_CHANGED';
  data: {
    from: string;
    to: string;
    seat: Seat;
  };
}

export interface GameEnded extends ServerEvent {
  type: 'GAME_ENDED';
  data: {
    winners: Seat[];
    winningFaction?: Faction;
    reason: string;
  };
}

export interface ErrorEvent extends ServerEvent {
  type: 'ERROR';
  data: {
    code: string;
    message: string;
  };
}

export type GameServerEvent =
  | StateSync
  | MatchCreated
  | PlayerJoined
  | PlayerLeft
  | MatchStarted
  | TurnStarted
  | DiceRolled
  | PlayerMoved
  | AreaActionPrompt
  | CardDrawn
  | HermitGiven
  | HermitReceived
  | HermitResolved
  | AttackResolved
  | PlayerRevealed
  | PlayerDied
  | CardPlayed
  | PhaseChanged
  | GameEnded
  | ErrorEvent;