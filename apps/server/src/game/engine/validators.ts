import type { MatchState, Command, Seat, PlayerState } from '@shadow-hunters/shared';
import { areAreasPaired } from '../utils/pairings';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateCommand(state: MatchState, command: Command): ValidationResult {
  if (state.status !== 'ACTIVE') {
    if (command.type === 'START_GAME' && state.status === 'LOBBY') {
      return { valid: true };
    }
    if (command.type === 'JOIN_MATCH' && state.status === 'LOBBY') {
      return { valid: true };
    }
    return { valid: false, error: 'Game is not active' };
  }

  if (state.winners && state.winners.length > 0) {
    return { valid: false, error: 'Game has ended' };
  }

  const activeSeat = state.activeSeat;
  if (activeSeat === undefined) {
    return { valid: false, error: 'No active player' };
  }

  const activePlayer = state.players[activeSeat];
  if (!activePlayer || !activePlayer.alive) {
    return { valid: false, error: 'Active player is dead' };
  }

  switch (command.type) {
    case 'ROLL_AND_MOVE':
      return validateRollAndMove(state);
    
    case 'CHOOSE_AREA':
      return validateChooseArea(state, command);
    
    case 'DO_AREA_ACTION':
      return validateAreaAction(state, command);
    
    case 'ATTACK':
      return validateAttack(state, command);
    
    case 'END_TURN':
      return validateEndTurn(state);
    
    case 'REVEAL_IDENTITY':
      return validateReveal(state);
    
    case 'USE_ABILITY':
      return validateAbility(state, command);
    
    case 'PLAY_CARD':
      return validatePlayCard(state, command);
    
    case 'RESOLVE_HERMIT':
      return validateResolveHermit(state, command);
    
    default:
      return { valid: false, error: 'Unknown command type' };
  }
}

function validateRollAndMove(state: MatchState): ValidationResult {
  if (state.phase !== 'MOVE') {
    return { valid: false, error: 'Not in move phase' };
  }
  
  if (state.pendingAreaChoice) {
    return { valid: false, error: 'Must choose area first' };
  }
  
  return { valid: true };
}

function validateChooseArea(state: MatchState, command: { areaId: string }): ValidationResult {
  if (state.phase !== 'MOVE') {
    return { valid: false, error: 'Not in move phase' };
  }
  
  if (!state.pendingAreaChoice) {
    return { valid: false, error: 'No area choice pending' };
  }
  
  const player = state.players[state.activeSeat!];
  if (command.areaId === player.position) {
    return { valid: false, error: 'Must choose a different area' };
  }
  
  if (!state.areas[command.areaId as any]) {
    return { valid: false, error: 'Invalid area' };
  }
  
  return { valid: true };
}

function validateAreaAction(state: MatchState, command: any): ValidationResult {
  if (state.phase !== 'AREA') {
    return { valid: false, error: 'Not in area action phase' };
  }
  
  const player = state.players[state.activeSeat!];
  const area = state.areas[player.position];
  
  if (!area || (!area.action && !area.actions)) {
    return { valid: false, error: 'No area action available' };
  }
  
  const action = command.action;
  
  // Helper function to check if area supports an action type
  function supportsActionType(actionType: string): boolean {
    if (area.actions) {
      return area.actions.some(spec => spec.type === actionType);
    }
    return area.action?.type === actionType;
  }
  
  switch (action.type) {
    case 'SKIP':
      return { valid: true };
    
    case 'DRAW_WHITE':
    case 'DRAW_BLACK':
      if (!supportsActionType(action.type)) {
        return { valid: false, error: 'Invalid action for this area' };
      }
      return { valid: true };
    
    case 'DRAW_HERMIT':
      if (!supportsActionType('DRAW_HERMIT')) {
        return { valid: false, error: 'Cannot draw Hermit card here' };
      }
      if (action.targetSeat === undefined) {
        return { valid: false, error: 'Must specify target for Hermit card' };
      }
      if (!state.players[action.targetSeat] || !state.players[action.targetSeat].alive) {
        return { valid: false, error: 'Invalid target player' };
      }
      return { valid: true };
    
    case 'HEAL':
    case 'DAMAGE':
      if (!supportsActionType('HEAL_OR_DAMAGE')) {
        return { valid: false, error: 'Cannot heal or damage here' };
      }
      if (action.targetSeat === undefined) {
        return { valid: false, error: 'Must specify target' };
      }
      if (!state.players[action.targetSeat] || !state.players[action.targetSeat].alive) {
        return { valid: false, error: 'Invalid target player' };
      }
      return { valid: true };
    
    case 'STEAL_EQUIPMENT':
      if (!supportsActionType('STEAL_EQUIPMENT')) {
        return { valid: false, error: 'Cannot steal equipment here' };
      }
      if (action.targetSeat === undefined) {
        return { valid: false, error: 'Must specify target' };
      }
      const target = state.players[action.targetSeat];
      if (!target || !target.alive) {
        return { valid: false, error: 'Invalid target player' };
      }
      if (!canStealFrom(player, target, state)) {
        return { valid: false, error: 'Target not in valid area' };
      }
      if (target.equipment.length === 0) {
        return { valid: false, error: 'Target has no equipment' };
      }
      return { valid: true };
    
    default:
      return { valid: false, error: 'Invalid area action' };
  }
}

function validateAttack(state: MatchState, command: { targetSeat: Seat }): ValidationResult {
  if (state.phase !== 'ATTACK') {
    return { valid: false, error: 'Not in attack phase' };
  }
  
  const attacker = state.players[state.activeSeat!];
  const target = state.players[command.targetSeat];
  
  if (!target || !target.alive) {
    return { valid: false, error: 'Invalid target' };
  }
  
  if (attacker.seat === target.seat) {
    return { valid: false, error: 'Cannot attack yourself' };
  }
  
  if (!canAttackTarget(attacker, target, state)) {
    return { valid: false, error: 'Target not in range' };
  }
  
  return { valid: true };
}

function validateEndTurn(state: MatchState): ValidationResult {
  if (state.phase === 'MOVE' && !state.pendingAreaChoice) {
    return { valid: false, error: 'Must complete move phase' };
  }
  
  return { valid: true };
}

function validateReveal(state: MatchState): ValidationResult {
  const player = state.players[state.activeSeat!];
  
  if (player.revealed) {
    return { valid: false, error: 'Already revealed' };
  }
  
  return { valid: true };
}

function validateAbility(state: MatchState, command: any): ValidationResult {
  return { valid: true };
}

function validatePlayCard(state: MatchState, command: any): ValidationResult {
  return { valid: true };
}

function validateResolveHermit(state: MatchState, command: any): ValidationResult {
  if (!state.hermitDelivery || state.hermitDelivery.to !== state.activeSeat) {
    return { valid: false, error: 'No Hermit card to resolve' };
  }
  
  return { valid: true };
}

function canStealFrom(thief: PlayerState, target: PlayerState, state: MatchState): boolean {
  if (thief.position === target.position) return true;
  
  if (!thief.position || !target.position) return false;
  
  return areAreasPaired(state, thief.position, target.position);
}

function canAttackTarget(attacker: PlayerState, target: PlayerState, state: MatchState): boolean {
  if (attacker.position === target.position) return true;
  
  if (!attacker.position || !target.position) return false;
  
  return areAreasPaired(state, attacker.position, target.position);
}