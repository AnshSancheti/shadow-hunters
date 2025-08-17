import type { AreaId, MatchState } from '@shadow-hunters/shared';

/**
 * Get the paired area for a given area ID using the game's dynamic pairings
 */
export function getPairedArea(state: MatchState, areaId: AreaId): AreaId | null {
  for (const [area1, area2] of state.areaPairings) {
    if (area1 === areaId) return area2;
    if (area2 === areaId) return area1;
  }
  return null;
}

/**
 * Check if two areas are paired together
 */
export function areAreasPaired(state: MatchState, area1: AreaId, area2: AreaId): boolean {
  return state.areaPairings.some(([a, b]) => 
    (a === area1 && b === area2) || (b === area1 && a === area2)
  );
}