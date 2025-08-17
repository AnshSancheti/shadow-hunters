import type { AreaId } from '@shadow-hunters/shared';

export const MIN_PLAYERS = 1; // Reduced to 1 for testing
export const MAX_PLAYERS = 8;

export const AREA_PAIRS: [AreaId, AreaId][] = [
  ['UNDERWORLD_GATE', 'CHURCH'],
  ['HERMIT_CABIN', 'CEMETERY'],
  ['WEIRD_WOODS', 'ERSTWHILE_ALTAR']
];

export const DICE_AREA_RANGES: Record<number, AreaId> = {
  2: 'UNDERWORLD_GATE',
  3: 'UNDERWORLD_GATE',
  4: 'CHURCH',
  5: 'CHURCH',
  6: 'HERMIT_CABIN',
  8: 'CEMETERY',
  9: 'WEIRD_WOODS',
  10: 'WEIRD_WOODS',
  11: 'ERSTWHILE_ALTAR',
  12: 'ERSTWHILE_ALTAR'
};

export const SPECIAL_DICE_SUM = 7;

export const DISCONNECT_TIMEOUT_MS = 120000;

export const FACTION_DISTRIBUTION = {
  1: { hunters: 1, shadows: 0, neutrals: 0 }, // Testing with 1 player
  2: { hunters: 1, shadows: 1, neutrals: 0 }, // Testing with 2 players
  3: { hunters: 1, shadows: 1, neutrals: 1 }, // Testing with 3 players
  4: { hunters: 2, shadows: 2, neutrals: 0 },
  5: { hunters: 2, shadows: 2, neutrals: 1 },
  6: { hunters: 2, shadows: 2, neutrals: 2 },
  7: { hunters: 3, shadows: 3, neutrals: 1 },
  8: { hunters: 3, shadows: 3, neutrals: 2 }
};