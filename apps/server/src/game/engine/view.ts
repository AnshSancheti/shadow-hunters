import type { 
  MatchState, 
  ClientView, 
  PublicPlayerView,
  Seat,
  LegalAction,
  GameEvent
} from '@shadow-hunters/shared';
import charactersData from '../data/characters.json';

export function createClientView(state: MatchState, viewerSeat?: Seat): ClientView {
  const players: Record<Seat, PublicPlayerView> = {};
  
  // Build public player views
  for (const [seat, player] of Object.entries(state.players)) {
    const seatNum = Number(seat) as Seat;
    const isViewer = seatNum === viewerSeat;
    
    players[seatNum] = {
      userId: player.userId,
      displayName: player.displayName,
      seat: seatNum,
      alive: player.alive,
      hp: player.hp,
      revealed: player.revealed,
      position: player.position,
      connected: player.connected,
      equipment: player.equipment.map(e => e.cardDefId),
      ...(player.revealed && {
        characterName: getCharacterName(player.characterId),
        faction: getCharacterFaction(player.characterId)
      })
    };
  }
  
  // Get viewer's private info
  const viewer = viewerSeat !== undefined ? state.players[viewerSeat] : undefined;
  
  // Determine legal actions for current player
  const legalActions = getLegalActions(state, viewerSeat);
  
  return {
    matchId: state.id,
    status: state.status,
    yourSeat: viewerSeat,
    activeSeat: state.activeSeat,
    phase: state.phase,
    round: state.round,
    players,
    areas: state.areas,
    lastDiceRoll: state.lastDiceRoll,
    lastRollContext: state.lastRollContext,
    pendingAreaChoice: state.pendingAreaChoice,
    legalActions,
    winners: state.winners,
    winningFaction: state.winningFaction,
    eventLog: [],
    ...(viewer && {
      yourHand: viewer.equipment,
      yourCharacter: charactersData.characters.find(c => c.id === viewer.characterId) as any
    })
  };
}

function getLegalActions(state: MatchState, viewerSeat?: Seat): LegalAction[] {
  const actions: LegalAction[] = [];
  
  if (state.status !== 'ACTIVE' || state.activeSeat === undefined || viewerSeat !== state.activeSeat) {
    return actions;
  }
  
  const player = state.players[state.activeSeat];
  if (!player || !player.alive) return actions;
  
  switch (state.phase) {
    case 'MOVE':
      if (state.pendingAreaChoice) {
        // Must choose an area (sum was 7)
        const currentArea = player.position;
        for (const areaId of Object.keys(state.areas)) {
          if (areaId !== currentArea) {
            actions.push({
              type: 'CHOOSE_AREA',
              params: { areaId }
            });
          }
        }
      } else {
        actions.push({ type: 'ROLL_AND_MOVE' });
      }
      break;
      
    case 'AREA':
      const area = player.position ? state.areas[player.position] : null;
      if (area && area.action.type !== 'NONE') {
        // Add specific area actions
        switch (area.action.type) {
          case 'DRAW_WHITE':
          case 'DRAW_BLACK':
            actions.push({
              type: 'DO_AREA_ACTION',
              params: { action: { type: area.action.type } }
            });
            break;
            
          case 'DRAW_HERMIT':
            // Can give to any living player
            for (const target of Object.values(state.players)) {
              if (target.alive) {
                actions.push({
                  type: 'DO_AREA_ACTION',
                  params: { 
                    action: { 
                      type: 'DRAW_HERMIT',
                      targetSeat: target.seat 
                    }
                  }
                });
              }
            }
            break;
            
          case 'HEAL_OR_DAMAGE':
            // Can heal or damage any player
            for (const target of Object.values(state.players)) {
              if (target.alive) {
                actions.push({
                  type: 'DO_AREA_ACTION',
                  params: {
                    action: {
                      type: 'HEAL',
                      targetSeat: target.seat,
                      amount: 1
                    }
                  }
                });
                actions.push({
                  type: 'DO_AREA_ACTION',
                  params: {
                    action: {
                      type: 'DAMAGE',
                      targetSeat: target.seat,
                      amount: 2
                    }
                  }
                });
              }
            }
            break;
            
          case 'STEAL_EQUIPMENT':
            // Can steal from players in same or paired area
            const pairedArea = player.position ? getPairedArea(player.position) : null;
            for (const target of Object.values(state.players)) {
              if (target.alive && 
                  target.seat !== player.seat &&
                  target.equipment.length > 0 &&
                  player.position &&
                  (target.position === player.position || 
                   (pairedArea && target.position === pairedArea))) {
                for (const equipment of target.equipment) {
                  actions.push({
                    type: 'DO_AREA_ACTION',
                    params: {
                      action: {
                        type: 'STEAL_EQUIPMENT',
                        targetSeat: target.seat,
                        equipmentId: equipment.id
                      }
                    }
                  });
                }
              }
            }
            break;
        }
        
        // Can always skip
        actions.push({
          type: 'DO_AREA_ACTION',
          params: { action: { type: 'SKIP' } }
        });
      } else {
        // No area action, must skip
        actions.push({
          type: 'DO_AREA_ACTION',
          params: { action: { type: 'SKIP' } }
        });
      }
      break;
      
    case 'ATTACK':
      // Can attack players in same or paired area
      const attackerPairedArea = player.position ? getPairedArea(player.position) : null;
      for (const target of Object.values(state.players)) {
        if (target.alive && 
            target.seat !== player.seat &&
            player.position &&
            (target.position === player.position || 
             (attackerPairedArea && target.position === attackerPairedArea))) {
          actions.push({
            type: 'ATTACK',
            params: { targetSeat: target.seat }
          });
        }
      }
      
      // Can skip attack
      actions.push({ type: 'END_TURN' });
      break;
      
    case 'END':
      actions.push({ type: 'END_TURN' });
      break;
  }
  
  // Can reveal identity at any time during turn
  if (!player.revealed && state.activeSeat === viewerSeat) {
    actions.push({ type: 'REVEAL_IDENTITY' });
  }
  
  return actions;
}

function getCharacterName(characterId: string): string {
  const character = charactersData.characters.find(c => c.id === characterId);
  return character ? character.name : 'Unknown';
}

function getCharacterFaction(characterId: string): any {
  const character = charactersData.characters.find(c => c.id === characterId);
  return character ? character.faction : null;
}

function getPairedArea(areaId: string): string | null {
  const pairs: Record<string, string> = {
    'UNDERWORLD_GATE': 'CHURCH',
    'CHURCH': 'UNDERWORLD_GATE',
    'HERMIT_CABIN': 'CEMETERY',
    'CEMETERY': 'HERMIT_CABIN',
    'WEIRD_WOODS': 'ERSTWHILE_ALTAR',
    'ERSTWHILE_ALTAR': 'WEIRD_WOODS'
  };
  return pairs[areaId] || null;
}