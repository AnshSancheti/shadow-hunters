import { io, Socket } from 'socket.io-client';
import type { GameServerEvent } from '@shadow-hunters/shared';
import { useGameStore } from '../state/store';

class SocketManager {
  private socket: Socket | null = null;
  
  connect() {
    if (this.socket?.connected) return;
    
    this.socket = io('http://localhost:8787', {
      transports: ['websocket'],
      autoConnect: true
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
      useGameStore.getState().setConnected(true);
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      useGameStore.getState().setConnected(false);
    });
    
    // Handle game events
    this.socket.on('STATE_SYNC', (event: GameServerEvent) => {
      if (event.type === 'STATE_SYNC') {
        useGameStore.getState().setView(event.data.view);
      }
    });
    
    this.socket.on('PLAYER_JOINED', (event: GameServerEvent) => {
      useGameStore.getState().addEvent(event);
    });
    
    this.socket.on('MATCH_STARTED', (event: GameServerEvent) => {
      useGameStore.getState().addEvent(event);
    });
    
    this.socket.on('TURN_STARTED', (event: GameServerEvent) => {
      useGameStore.getState().addEvent(event);
    });
    
    this.socket.on('DICE_ROLLED', (event: GameServerEvent) => {
      useGameStore.getState().addEvent(event);
    });
    
    this.socket.on('PLAYER_MOVED', (event: GameServerEvent) => {
      useGameStore.getState().addEvent(event);
    });
    
    this.socket.on('ATTACK_RESOLVED', (event: GameServerEvent) => {
      useGameStore.getState().addEvent(event);
    });
    
    this.socket.on('PLAYER_REVEALED', (event: GameServerEvent) => {
      useGameStore.getState().addEvent(event);
    });
    
    this.socket.on('PLAYER_DIED', (event: GameServerEvent) => {
      useGameStore.getState().addEvent(event);
    });
    
    this.socket.on('GAME_ENDED', (event: GameServerEvent) => {
      useGameStore.getState().addEvent(event);
    });
    
    this.socket.on('ERROR', (event: GameServerEvent) => {
      console.error('Game error:', event.data);
      useGameStore.getState().addEvent(event);
    });
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.error('Socket not connected');
    }
  }
  
  joinMatch(matchId: string, displayName: string, userId?: string) {
    this.emit('JOIN_MATCH', { 
      type: 'JOIN_MATCH',
      matchId, 
      displayName, 
      userId 
    });
  }
  
  startGame(matchId: string) {
    this.emit('START_GAME', { 
      type: 'START_GAME',
      matchId 
    });
  }
  
  rollAndMove() {
    this.emit('ROLL_AND_MOVE', {});
  }
  
  chooseArea(areaId: string) {
    this.emit('CHOOSE_AREA', { areaId });
  }
  
  doAreaAction(action: any) {
    this.emit('DO_AREA_ACTION', { action });
  }
  
  attack(targetSeat: number) {
    this.emit('ATTACK', { targetSeat });
  }
  
  endTurn() {
    this.emit('END_TURN', {});
  }
  
  revealIdentity() {
    this.emit('REVEAL_IDENTITY', {});
  }
}

export const socketManager = new SocketManager();