import type { 
  MatchState, 
  Command, 
  GameServerEvent,
  Seat,
  PlayerState,
  AreaId,
  DeckState,
  CardDef
} from '@shadow-hunters/shared';
import { nanoid } from 'nanoid';
import { RNG } from './rng';
import { validateCommand } from './validators';
import { 
  DICE_AREA_RANGES, 
  SPECIAL_DICE_SUM
} from '../model/constants';
import { areAreasPaired } from '../utils/pairings';

export interface ReducerContext {
  state: MatchState;
  rng: RNG;
  timestamp: number;
}

export function gameReducer(
  context: ReducerContext,
  command: Command
): GameServerEvent[] {
  const { state, rng, timestamp } = context;
  const events: GameServerEvent[] = [];

  const validation = validateCommand(state, command);
  if (!validation.valid) {
    events.push({
      id: nanoid(),
      timestamp,
      type: 'ERROR',
      data: {
        code: 'INVALID_COMMAND',
        message: validation.error || 'Invalid command'
      }
    });
    return events;
  }

  switch (command.type) {
    case 'ROLL_AND_MOVE': {
      const roll = rng.rollDice();
      const mustChooseArea = roll.sum === SPECIAL_DICE_SUM;
      
      events.push({
        id: nanoid(),
        timestamp,
        type: 'DICE_ROLLED',
        data: {
          seat: state.activeSeat!,
          roll,
          mustChooseArea,
          rollContext: 'MOVE'
        }
      });

      if (!mustChooseArea) {
        const targetArea = DICE_AREA_RANGES[roll.sum];
        if (targetArea) {
          const player = state.players[state.activeSeat!];
          if (player.position === targetArea) {
            return [...events, ...gameReducer(context, { type: 'ROLL_AND_MOVE' })];
          }

          events.push({
            id: nanoid(),
            timestamp,
            type: 'PLAYER_MOVED',
            data: {
              seat: state.activeSeat!,
              from: player.position,
              to: targetArea
            }
          });

          events.push({
            id: nanoid(),
            timestamp,
            type: 'PHASE_CHANGED',
            data: {
              from: 'MOVE',
              to: 'AREA',
              seat: state.activeSeat!
            }
          });
        }
      }
      break;
    }

    case 'CHOOSE_AREA': {
      const player = state.players[state.activeSeat!];
      if (command.areaId === player.position) {
        events.push({
          id: nanoid(),
          timestamp,
          type: 'ERROR',
          data: {
            code: 'SAME_AREA',
            message: 'You must choose a different area'
          }
        });
        return events;
      }

      events.push({
        id: nanoid(),
        timestamp,
        type: 'PLAYER_MOVED',
        data: {
          seat: state.activeSeat!,
          from: player.position,
          to: command.areaId
        }
      });
      
      // Clear the pending area choice flag
      events.push({
        id: nanoid(),
        timestamp,
        type: 'AREA_CHOICE_RESOLVED',
        data: {
          seat: state.activeSeat!
        }
      });

      events.push({
        id: nanoid(),
        timestamp,
        type: 'PHASE_CHANGED',
        data: {
          from: 'MOVE',
          to: 'AREA',
          seat: state.activeSeat!
        }
      });
      break;
    }

    case 'DO_AREA_ACTION': {
      const action = command.action;
      const seat = state.activeSeat!;
      
      switch (action.type) {
        case 'DRAW_WHITE':
        case 'DRAW_BLACK': {
          const deckType = action.type === 'DRAW_WHITE' ? 'WHITE' : 'BLACK';
          const card = drawCard(state.decks[deckType], rng);
          
          if (card) {
            events.push({
              id: nanoid(),
              timestamp,
              type: 'CARD_DRAWN',
              data: {
                seat,
                deck: deckType,
                cardName: card,
                isYou: false
              }
            });
          }
          break;
        }

        case 'DRAW_HERMIT': {
          const card = drawCard(state.decks.HERMIT, rng);
          if (card && action.targetSeat !== undefined) {
            events.push({
              id: nanoid(),
              timestamp,
              type: 'HERMIT_GIVEN',
              data: {
                from: seat,
                to: action.targetSeat
              }
            });
          }
          break;
        }

        case 'HEAL': {
          if (action.targetSeat !== undefined && action.amount) {
            const target = state.players[action.targetSeat];
            const newHp = Math.min(target.hp + action.amount, getMaxHp(target));
            
            events.push({
              id: nanoid(),
              timestamp,
              type: 'PLAYER_HEALED',
              data: {
                seat: action.targetSeat,
                amount: action.amount,
                newHp
              }
            });
          }
          break;
        }

        case 'DAMAGE': {
          if (action.targetSeat !== undefined && action.amount) {
            const target = state.players[action.targetSeat];
            const newHp = Math.max(0, target.hp - action.amount);
            
            events.push({
              id: nanoid(),
              timestamp,
              type: 'PLAYER_DAMAGED',
              data: {
                seat: action.targetSeat,
                amount: action.amount,
                newHp,
                source: 'AREA_ACTION'
              }
            });

            if (newHp === 0) {
              events.push({
                id: nanoid(),
                timestamp,
                type: 'PLAYER_DIED',
                data: {
                  seat: action.targetSeat,
                  killedBy: seat
                }
              });
            }
          }
          break;
        }

        case 'STEAL_EQUIPMENT': {
          if (action.targetSeat !== undefined && action.equipmentId) {
            events.push({
              id: nanoid(),
              timestamp,
              type: 'EQUIPMENT_STOLEN',
              data: {
                from: action.targetSeat,
                to: seat,
                equipmentId: action.equipmentId
              }
            });
          }
          break;
        }

        case 'SKIP': {
          break;
        }
      }

      events.push({
        id: nanoid(),
        timestamp,
        type: 'PHASE_CHANGED',
        data: {
          from: 'AREA',
          to: 'ATTACK',
          seat
        }
      });
      break;
    }

    case 'ATTACK': {
      const attacker = state.players[state.activeSeat!];
      const target = state.players[command.targetSeat];
      
      if (!canAttack(attacker, target, state)) {
        events.push({
          id: nanoid(),
          timestamp,
          type: 'ERROR',
          data: {
            code: 'INVALID_TARGET',
            message: 'Cannot attack that target'
          }
        });
        return events;
      }

      const roll = rng.rollDice();
      const damage = roll.difference;
      const newHp = Math.max(0, target.hp - damage);
      
      // Emit dice roll event for display
      events.push({
        id: nanoid(),
        timestamp,
        type: 'DICE_ROLLED',
        data: {
          seat: state.activeSeat!,
          roll,
          rollContext: 'ATTACK'
        }
      });

      events.push({
        id: nanoid(),
        timestamp,
        type: 'ATTACK_RESOLVED',
        data: {
          attacker: state.activeSeat!,
          target: command.targetSeat,
          roll,
          damage,
          targetHp: newHp,
          killed: newHp === 0
        }
      });

      if (newHp === 0) {
        events.push({
          id: nanoid(),
          timestamp,
          type: 'PLAYER_DIED',
          data: {
            seat: command.targetSeat,
            killedBy: state.activeSeat!
          }
        });
      }

      // Transition to END phase after attack
      events.push({
        id: nanoid(),
        timestamp,
        type: 'PHASE_CHANGED',
        data: {
          from: 'ATTACK',
          to: 'END',
          seat: state.activeSeat!
        }
      });
      break;
    }

    case 'END_TURN': {
      const nextSeat = getNextAliveSeat(state);
      
      events.push({
        id: nanoid(),
        timestamp,
        type: 'TURN_STARTED',
        data: {
          seat: nextSeat,
          round: state.round + 1,
          phase: 'MOVE'
        }
      });
      break;
    }

    case 'REVEAL_IDENTITY': {
      const player = state.players[state.activeSeat!];
      const character = getCharacterById(player.characterId);
      
      if (character) {
        events.push({
          id: nanoid(),
          timestamp,
          type: 'PLAYER_REVEALED',
          data: {
            seat: state.activeSeat!,
            characterName: character.name,
            faction: character.faction
          }
        });
      }
      break;
    }
  }

  return events;
}

function drawCard(deck: DeckState, rng: RNG): string | null {
  if (deck.draw.length === 0) {
    if (deck.discard.length === 0) return null;
    deck.draw = rng.shuffle(deck.discard);
    deck.discard = [];
  }
  return deck.draw.pop() || null;
}

function canAttack(attacker: PlayerState, target: PlayerState, state: MatchState): boolean {
  if (!attacker.alive || !target.alive) return false;
  if (attacker.seat === target.seat) return false;
  
  const attackerArea = attacker.position;
  const targetArea = target.position;
  
  if (attackerArea === targetArea) return true;
  
  return areAreasPaired(state, attackerArea, targetArea);
}

function getNextAliveSeat(state: MatchState): Seat {
  const currentIndex = state.turnOrder.indexOf(state.activeSeat!);
  let nextIndex = (currentIndex + 1) % state.turnOrder.length;
  
  while (!state.players[state.turnOrder[nextIndex]].alive) {
    nextIndex = (nextIndex + 1) % state.turnOrder.length;
  }
  
  return state.turnOrder[nextIndex];
}

function getMaxHp(player: PlayerState): number {
  return 14;
}

function getCharacterById(id: string): any {
  return null;
}