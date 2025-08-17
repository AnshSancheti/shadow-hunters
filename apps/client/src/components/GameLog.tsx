import { useGameStore } from '../state/store';
import { useEffect, useRef } from 'react';

function GameLog() {
  const { events, view } = useGameStore();
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const formatEvent = (event: any) => {
    const time = new Date(event.timestamp).toLocaleTimeString();
    let message = '';
    let color = 'white';

    switch (event.type) {
      case 'PLAYER_JOINED':
        message = `${event.data.displayName} joined the game`;
        color = '#4caf50';
        break;
      
      case 'MATCH_STARTED':
        message = 'Game started!';
        color = 'gold';
        break;
      
      case 'TURN_STARTED':
        const player = view?.players[event.data.seat];
        message = `${player?.displayName}'s turn (Round ${event.data.round})`;
        color = '#2196f3';
        break;
      
      case 'DICE_ROLLED':
        const roller = view?.players[event.data.seat];
        message = `${roller?.displayName} rolled ${event.data.roll.d6} + ${event.data.roll.d4} = ${event.data.roll.sum}`;
        if (event.data.mustChooseArea) {
          message += ' (must choose area)';
          color = 'orange';
        }
        break;
      
      case 'PLAYER_MOVED':
        const mover = view?.players[event.data.seat];
        const toArea = view?.areas[event.data.to];
        message = `${mover?.displayName} moved to ${toArea?.name}`;
        break;
      
      case 'ATTACK_RESOLVED':
        const attacker = view?.players[event.data.attacker];
        const target = view?.players[event.data.target];
        message = `${attacker?.displayName} attacked ${target?.displayName} for ${event.data.damage} damage`;
        if (event.data.killed) {
          message += ' (KILLED!)';
          color = 'red';
        }
        break;
      
      case 'PLAYER_REVEALED':
        message = `${event.data.characterName} revealed as ${event.data.faction}!`;
        color = 'gold';
        break;
      
      case 'PLAYER_DIED':
        const dead = view?.players[event.data.seat];
        message = `${dead?.displayName} has died`;
        color = 'red';
        break;
      
      case 'GAME_ENDED':
        message = `Game Over! ${event.data.reason}`;
        color = 'gold';
        break;
      
      case 'ERROR':
        message = `Error: ${event.data.message}`;
        color = 'red';
        break;
      
      default:
        message = event.type;
    }

    return { time, message, color };
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{ marginBottom: '15px' }}>Game Log</h3>
      
      <div style={{ 
        flex: 1,
        overflow: 'auto',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '4px',
        padding: '10px'
      }}>
        {events.map((event, i) => {
          const { time, message, color } = formatEvent(event);
          return (
            <div 
              key={i}
              style={{ 
                marginBottom: '8px',
                fontSize: '12px',
                lineHeight: '1.4'
              }}
            >
              <span style={{ opacity: 0.5 }}>[{time}]</span>{' '}
              <span style={{ color }}>{message}</span>
            </div>
          );
        })}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

export default GameLog;