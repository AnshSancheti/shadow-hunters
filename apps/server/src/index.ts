import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { MatchService } from './game/services/matches';
import { CommandSchema } from '@shadow-hunters/shared';
import { z } from 'zod';

const fastify = Fastify({
  logger: true
});

const matchService = new MatchService();

// HTTP endpoints
fastify.post('/match', async (request, reply) => {
  const body = request.body as { displayName: string };
  const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const { matchId, match } = matchService.createMatch(userId, body.displayName);
  
  return {
    matchId,
    userId,
    seat: 0,
    token: userId // Simple token for MVP
  };
});

fastify.post('/match/:id/join', async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = request.body as { displayName: string; userId?: string };
  
  const userId = body.userId || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const result = matchService.joinMatch(id, userId, body.displayName);
  
  if (!result.success) {
    reply.code(400);
    return { error: result.error };
  }
  
  return {
    matchId: id,
    userId,
    seat: result.seat,
    token: userId
  };
});

// Start server
const start = async () => {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
      credentials: true
    });
    
    await fastify.listen({ port: 8787, host: '0.0.0.0' });
    
    // Initialize Socket.IO
    const io = new Server(fastify.server, {
      cors: {
        origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      let currentMatchId: string | null = null;
      let currentUserId: string | null = null;
      let currentSeat: number | null = null;
      
      // Store user data on the socket for identification
      socket.data = socket.data || {};
      
      socket.on('JOIN_MATCH', async (data) => {
        try {
          const parsed = CommandSchema.JOIN_MATCH.parse(data);
          currentMatchId = parsed.matchId;
          currentUserId = parsed.userId || `user-${socket.id}`;
          
          // Store userId in socket data for later identification
          socket.data.userId = currentUserId;
          socket.data.matchId = currentMatchId;
          
          // Check if user is already in the match (from HTTP join)
          const match = matchService.getMatch(parsed.matchId);
          if (match) {
            const existingPlayer = Object.values(match.players).find(p => p.userId === currentUserId);
            if (existingPlayer) {
              // User already in match, just connect the socket
              currentSeat = existingPlayer.seat;
              socket.data.seat = currentSeat;
              existingPlayer.connected = true;
              socket.join(parsed.matchId);
              
              // Send state sync to reconnecting player
              const view = matchService.getClientView(parsed.matchId, existingPlayer.seat);
              socket.emit('STATE_SYNC', {
                id: Date.now().toString(),
                timestamp: Date.now(),
                type: 'STATE_SYNC',
                data: {
                  view,
                  lastEvent: 0
                }
              });
              
              // Notify others of reconnection and send them their own views
              const sockets = await io.in(parsed.matchId).fetchSockets();
              for (const s of sockets) {
                if (s.id !== socket.id) {
                  // Send each other player their own view
                  const otherUserId = s.data?.userId;
                  if (otherUserId) {
                    const otherPlayer = Object.values(match.players).find(p => p.userId === otherUserId);
                    if (otherPlayer) {
                      const otherView = matchService.getClientView(parsed.matchId, otherPlayer.seat);
                      s.emit('STATE_SYNC', {
                        id: Date.now().toString(),
                        timestamp: Date.now(),
                        type: 'STATE_SYNC',
                        data: {
                          view: otherView,
                          lastEvent: match.eventsApplied
                        }
                      });
                    }
                  }
                }
              }
              
              return;
            }
          }
          
          // New player joining - this shouldn't happen if they used HTTP endpoint first
          socket.emit('ERROR', {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: 'ERROR',
            data: {
              code: 'JOIN_FAILED',
              message: 'Please use the join/create game flow'
            }
          });
        } catch (error) {
          console.error('JOIN_MATCH error:', error);
          socket.emit('ERROR', {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: 'ERROR',
            data: {
              code: 'INVALID_DATA',
              message: 'Invalid join data'
            }
          });
        }
      });
      
      socket.on('START_GAME', async (data) => {
        try {
          if (!currentMatchId) return;
          
          const result = matchService.startMatch(currentMatchId);
          
          if (result.success) {
            const match = matchService.getMatch(currentMatchId);
            if (match) {
              // Send game started to all players
              io.to(currentMatchId).emit('MATCH_STARTED', {
                id: Date.now().toString(),
                timestamp: Date.now(),
                type: 'MATCH_STARTED',
                data: {
                  seats: match.seats,
                  yourSeat: currentSeat
                }
              });
              
              // Send state sync to all players with their own views
              const sockets = await io.in(currentMatchId).fetchSockets();
              for (const s of sockets) {
                const socketUserId = s.data?.userId;
                if (socketUserId) {
                  const player = Object.values(match.players).find(p => p.userId === socketUserId);
                  if (player) {
                    const view = matchService.getClientView(currentMatchId, player.seat);
                    s.emit('STATE_SYNC', {
                      id: Date.now().toString(),
                      timestamp: Date.now(),
                      type: 'STATE_SYNC',
                      data: {
                        view,
                        lastEvent: 0
                      }
                    });
                  }
                }
              }
              
              // Send turn started
              io.to(currentMatchId).emit('TURN_STARTED', {
                id: Date.now().toString(),
                timestamp: Date.now(),
                type: 'TURN_STARTED',
                data: {
                  seat: match.activeSeat,
                  round: 1,
                  phase: 'MOVE'
                }
              });
            }
          } else {
            socket.emit('ERROR', {
              id: Date.now().toString(),
              timestamp: Date.now(),
              type: 'ERROR',
              data: {
                code: 'START_FAILED',
                message: result.error || 'Failed to start match'
              }
            });
          }
        } catch (error) {
          console.error('START_GAME error:', error);
        }
      });
      
      // Handle game commands
      const gameCommands = [
        'ROLL_AND_MOVE',
        'CHOOSE_AREA',
        'DO_AREA_ACTION',
        'ATTACK',
        'END_TURN',
        'REVEAL_IDENTITY',
        'USE_ABILITY',
        'PLAY_CARD',
        'RESOLVE_HERMIT'
      ];
      
      for (const commandType of gameCommands) {
        socket.on(commandType, (data) => {
          try {
            if (!currentMatchId || !currentUserId) return;
            
            const command = { type: commandType, ...data };
            const events = matchService.processCommand(currentMatchId, currentUserId, command);
            
            // Broadcast events to all players in match
            for (const event of events) {
              io.to(currentMatchId).emit(event.type, event);
            }
            
            // Send updated state to all players
            const match = matchService.getMatch(currentMatchId);
            if (match) {
              for (const seat of match.seats) {
                const view = matchService.getClientView(currentMatchId, seat);
                io.to(currentMatchId).emit('STATE_SYNC', {
                  id: Date.now().toString(),
                  timestamp: Date.now(),
                  type: 'STATE_SYNC',
                  data: {
                    view,
                    lastEvent: match.eventsApplied
                  }
                });
              }
            }
          } catch (error) {
            console.error(`${commandType} error:`, error);
            socket.emit('ERROR', {
              id: Date.now().toString(),
              timestamp: Date.now(),
              type: 'ERROR',
              data: {
                code: 'COMMAND_FAILED',
                message: 'Failed to process command'
              }
            });
          }
        });
      }
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        if (currentMatchId && currentUserId) {
          const match = matchService.getMatch(currentMatchId);
          if (match) {
            const player = Object.values(match.players).find(p => p.userId === currentUserId);
            if (player) {
              player.connected = false;
              
              socket.to(currentMatchId).emit('PLAYER_LEFT', {
                id: Date.now().toString(),
                timestamp: Date.now(),
                type: 'PLAYER_LEFT',
                data: {
                  seat: player.seat
                }
              });
            }
          }
        }
      });
    });
    
    console.log(`Server listening on http://localhost:8787`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();