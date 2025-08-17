import type { MatchState, Faction, Seat } from '@shadow-hunters/shared';
import charactersData from '../data/characters.json';

interface WinResult {
  winners: Seat[];
  faction?: Faction;
  reason: string;
}

export function evaluateWin(state: MatchState): WinResult | null {
  const alivePlayers = Object.values(state.players).filter(p => p.alive);
  
  if (alivePlayers.length === 0) {
    return { winners: [], reason: 'No players alive' };
  }

  const factionCounts = countFactions(state);
  
  // Hunters win if all Shadows are dead
  if (factionCounts.shadows === 0) {
    const hunterSeats = getSeatsOfFaction(state, 'HUNTER');
    return {
      winners: hunterSeats,
      faction: 'HUNTER',
      reason: 'All Shadows have been eliminated'
    };
  }
  
  // Shadows win if all Hunters are dead OR if they equal/outnumber Hunters
  if (factionCounts.hunters === 0) {
    const shadowSeats = getSeatsOfFaction(state, 'SHADOW');
    return {
      winners: shadowSeats,
      faction: 'SHADOW',
      reason: 'All Hunters have been eliminated'
    };
  }
  
  // Check neutral win conditions
  const neutralWins = checkNeutralWins(state);
  if (neutralWins) {
    return neutralWins;
  }
  
  // Check if only one faction remains
  const remainingFactions = new Set(
    alivePlayers
      .filter(p => p.revealed)
      .map(p => getFactionOfCharacter(p.characterId))
      .filter(Boolean)
  );
  
  if (remainingFactions.size === 1) {
    const faction = Array.from(remainingFactions)[0] as Faction;
    const winners = getSeatsOfFaction(state, faction);
    return {
      winners,
      faction,
      reason: `Only ${faction} players remain`
    };
  }
  
  return null;
}

function countFactions(state: MatchState): Record<string, number> {
  const counts = { hunters: 0, shadows: 0, neutrals: 0 };
  
  for (const player of Object.values(state.players)) {
    if (!player.alive) continue;
    
    const faction = getFactionOfCharacter(player.characterId);
    if (faction === 'HUNTER') counts.hunters++;
    else if (faction === 'SHADOW') counts.shadows++;
    else if (faction === 'NEUTRAL') counts.neutrals++;
  }
  
  return counts;
}

function getSeatsOfFaction(state: MatchState, faction: Faction): Seat[] {
  return Object.values(state.players)
    .filter(p => {
      const charFaction = getFactionOfCharacter(p.characterId);
      return charFaction === faction;
    })
    .map(p => p.seat);
}

function getFactionOfCharacter(characterId: string): Faction | null {
  const character = charactersData.characters.find(c => c.id === characterId);
  return character ? character.faction as Faction : null;
}

function checkNeutralWins(state: MatchState): WinResult | null {
  for (const player of Object.values(state.players)) {
    const character = charactersData.characters.find(c => c.id === player.characterId);
    if (!character || character.faction !== 'NEUTRAL') continue;
    
    // Allie wins if first to die
    if (character.id === 'ALLIE' && !player.alive) {
      const deadCount = Object.values(state.players).filter(p => !p.alive).length;
      if (deadCount === 1) {
        return {
          winners: [player.seat],
          reason: 'Allie was the first to die'
        };
      }
    }
    
    // Bob wins if has 5+ equipment
    if (character.id === 'BOB' && player.alive && player.equipment.length >= 5) {
      return {
        winners: [player.seat],
        reason: 'Bob collected 5 equipment cards'
      };
    }
    
    // Charles wins if one of last 2 alive
    if (character.id === 'CHARLES' && player.alive) {
      const aliveCount = Object.values(state.players).filter(p => p.alive).length;
      if (aliveCount <= 2) {
        return {
          winners: [player.seat],
          reason: 'Charles survived to the final 2'
        };
      }
    }
  }
  
  return null;
}