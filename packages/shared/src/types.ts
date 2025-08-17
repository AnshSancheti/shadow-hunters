export type Seat = number;
export type Faction = 'HUNTER' | 'SHADOW' | 'NEUTRAL';
export type DeckType = 'WHITE' | 'BLACK' | 'HERMIT';
export type AreaId = 'UNDERWORLD_GATE' | 'CHURCH' | 'HERMIT_CABIN' | 'CEMETERY' | 'WEIRD_WOODS' | 'ERSTWHILE_ALTAR';
export type Phase = 'MOVE' | 'AREA' | 'ATTACK' | 'END';
export type MatchStatus = 'LOBBY' | 'ACTIVE' | 'ENDED';

export interface CharacterDef {
  id: string;
  name: string;
  faction: Faction;
  maxHp: number;
  abilities?: AbilitySpec[];
}

export interface AbilitySpec {
  id: string;
  name: string;
  description: string;
  timing: AbilityTiming;
  effect?: EffectSpec;
}

export type AbilityTiming = 
  | 'onBeforeMove' 
  | 'onAfterMove'
  | 'onBeforeAreaAction' 
  | 'onAfterAreaAction'
  | 'onBeforeAttack' 
  | 'onAttackRoll' 
  | 'onDamageApply' 
  | 'onAfterAttack'
  | 'onBeforeReveal' 
  | 'onAfterReveal' 
  | 'onDeath';

export interface PlayerState {
  userId: string;
  displayName: string;
  seat: Seat;
  alive: boolean;
  hp: number;
  revealed: boolean;
  characterId: string;
  equipment: CardInstance[];
  position: AreaId;
  connected: boolean;
}

export interface CardInstance {
  id: string;
  cardDefId: string;
  ownerId?: Seat;
}

export interface AreaDef {
  id: AreaId;
  name: string;
  range: [number, number];
  pairedWith?: AreaId;
  action: AreaActionSpec;
}

export interface AreaActionSpec {
  type: 'DRAW_WHITE' | 'DRAW_BLACK' | 'DRAW_HERMIT' | 'HEAL_OR_DAMAGE' | 'STEAL_EQUIPMENT' | 'NONE';
  description: string;
}

export interface DeckState {
  draw: string[];
  discard: string[];
}

export interface CardDef {
  id: string;
  name: string;
  deck: DeckType;
  kind: 'EQUIPMENT' | 'SINGLE_USE';
  text: string;
  effect?: EffectSpec;
}

export interface EffectSpec {
  type: string;
  params: Record<string, any>;
}

export interface DiceRoll {
  d6: number;
  d4: number;
  sum: number;
  difference: number;
}

export interface MatchState {
  id: string;
  status: MatchStatus;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  seats: Seat[];
  turnOrder: Seat[];
  activeSeat?: Seat;
  phase: Phase;
  round: number;
  rngSeed: string;
  players: Record<Seat, PlayerState>;
  areas: Record<AreaId, AreaDef>;
  decks: {
    WHITE: DeckState;
    BLACK: DeckState;
    HERMIT: DeckState;
  };
  piles: {
    WHITE: string[];
    BLACK: string[];
    HERMIT: string[];
  };
  lastDiceRoll?: DiceRoll;
  pendingAreaChoice?: boolean;
  hermitDelivery?: {
    from: Seat;
    to: Seat;
    cardId: string;
  };
  eventsApplied: number;
  winners?: Seat[];
  winningFaction?: Faction;
}

export interface PublicPlayerView {
  userId: string;
  displayName: string;
  seat: Seat;
  alive: boolean;
  hp: number;
  revealed: boolean;
  characterName?: string;
  faction?: Faction;
  equipment: string[];
  position: AreaId;
  connected: boolean;
}

export interface ClientView {
  matchId: string;
  status: MatchStatus;
  yourSeat?: Seat;
  activeSeat?: Seat;
  phase: Phase;
  round: number;
  players: Record<Seat, PublicPlayerView>;
  areas: Record<AreaId, AreaDef>;
  yourHand?: CardInstance[];
  yourCharacter?: CharacterDef;
  lastDiceRoll?: DiceRoll;
  pendingAreaChoice?: boolean;
  legalActions: LegalAction[];
  winners?: Seat[];
  winningFaction?: Faction;
  eventLog: GameEvent[];
}

export interface LegalAction {
  type: string;
  params?: Record<string, any>;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  type: string;
  data: Record<string, any>;
  public: boolean;
}