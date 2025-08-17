import { create } from 'zustand';
import type { ClientView, GameServerEvent } from '@shadow-hunters/shared';

interface GameStore {
  // Connection
  connected: boolean;
  matchId: string | null;
  userId: string | null;
  
  // Game state
  view: ClientView | null;
  events: GameServerEvent[];
  
  // Actions
  setConnected: (connected: boolean) => void;
  setMatchInfo: (matchId: string, userId: string) => void;
  setView: (view: ClientView) => void;
  addEvent: (event: GameServerEvent) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  connected: false,
  matchId: null,
  userId: null,
  view: null,
  events: [],
  
  setConnected: (connected) => set({ connected }),
  
  setMatchInfo: (matchId, userId) => set({ matchId, userId }),
  
  setView: (view) => set({ view }),
  
  addEvent: (event) => set((state) => ({
    events: [...state.events, event]
  })),
  
  reset: () => set({
    connected: false,
    matchId: null,
    userId: null,
    view: null,
    events: []
  })
}));