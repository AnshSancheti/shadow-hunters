import { useEffect } from 'react';
import { useGameStore } from '../state/store';
import { socketManager } from '../api/socket';

interface LobbyProps {
  displayName: string;
}

function Lobby({ displayName }: LobbyProps) {
  const { view, matchId } = useGameStore();

  useEffect(() => {
    // Reload if user navigates directly to lobby without a match
    if (!matchId) {
      window.location.reload();
    }
  }, [matchId]);

  const handleStartGame = () => {
    if (matchId) {
      socketManager.startGame(matchId);
    }
  };

  if (!view || view.status !== 'LOBBY') {
    return (
      <div className="container">
        <div className="card" style={{ maxWidth: '600px', margin: '50px auto', textAlign: 'center' }}>
          <h2>Loading lobby...</h2>
        </div>
      </div>
    );
  }

  const players = Object.values(view.players);
  const isHost = view.yourSeat === 0;
  const canStart = players.length >= 1 && isHost; // Allow starting with 1 player for testing

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '600px', margin: '50px auto' }}>
        <h2>Game Lobby</h2>
        <div style={{ 
          marginTop: '20px',
          padding: '20px',
          background: 'rgba(74, 158, 255, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(74, 158, 255, 0.3)',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, marginBottom: '10px', fontSize: '14px', opacity: 0.7 }}>
            Share this code with friends:
          </p>
          <div style={{ 
            fontSize: '36px', 
            fontWeight: 'bold',
            letterSpacing: '8px',
            color: '#4a9eff',
            fontFamily: 'monospace'
          }}>
            {matchId}
          </div>
        </div>
        
        <div style={{ marginTop: '30px' }}>
          <h3>Players ({players.length}/8)</h3>
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {players.map((player) => (
              <div 
                key={player.seat}
                style={{ 
                  padding: '12px',
                  background: player.seat === view.yourSeat 
                    ? 'rgba(74, 158, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: player.seat === view.yourSeat 
                    ? '1px solid rgba(74, 158, 255, 0.3)'
                    : '1px solid transparent'
                }}
              >
                <span>{player.displayName}</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {player.seat === 0 && (
                    <span style={{ 
                      opacity: 0.7, 
                      fontSize: '12px',
                      padding: '2px 8px',
                      background: 'rgba(255, 215, 0, 0.2)',
                      borderRadius: '4px',
                      color: 'gold'
                    }}>
                      Host
                    </span>
                  )}
                  {player.seat === view.yourSeat && (
                    <span style={{ 
                      opacity: 0.7, 
                      fontSize: '12px',
                      padding: '2px 8px',
                      background: 'rgba(74, 158, 255, 0.2)',
                      borderRadius: '4px'
                    }}>
                      You
                    </span>
                  )}
                  {!player.connected && (
                    <span style={{ 
                      opacity: 0.5, 
                      fontSize: '12px',
                      padding: '2px 8px',
                      background: 'rgba(255, 0, 0, 0.2)',
                      borderRadius: '4px',
                      color: '#ff6b6b'
                    }}>
                      Disconnected
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {Array.from({ length: Math.max(0, 8 - players.length) }).map((_, i) => (
              <div 
                key={`optional-${i}`}
                style={{ 
                  padding: '12px',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  opacity: 0.2,
                  textAlign: 'center',
                  fontSize: '14px'
                }}
              >
                Waiting for player...
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ marginTop: '30px' }}>
          {isHost ? (
            <button 
              onClick={handleStartGame}
              disabled={!canStart}
              style={{ 
                width: '100%', 
                padding: '15px',
                fontSize: '16px',
                background: canStart ? '#4caf50' : '#4a9eff'
              }}
            >
              Start Game (Testing Mode)
            </button>
          ) : (
            <div style={{ 
              padding: '15px', 
              textAlign: 'center', 
              opacity: 0.7,
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px'
            }}>
              Waiting for host to start game...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Lobby;