import { useState, useEffect } from 'react';
import { useGameStore } from '../state/store';
import { socketManager } from '../api/socket';

interface LobbyProps {
  onStartGame: () => void;
}

function Lobby({ onStartGame }: LobbyProps) {
  const { view, matchId, userId } = useGameStore();
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (view?.status === 'ACTIVE') {
      onStartGame();
    }
  }, [view, onStartGame]);

  const handleCreateMatch = async () => {
    if (!displayName.trim()) return;
    
    setIsCreating(true);
    try {
      const response = await fetch('http://localhost:8787/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
      });
      
      const data = await response.json();
      useGameStore.getState().setMatchInfo(data.matchId, data.userId);
      socketManager.joinMatch(data.matchId, displayName, data.userId);
      setJoinCode(data.matchId);
    } catch (error) {
      console.error('Failed to create match:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinMatch = async () => {
    if (!displayName.trim() || !joinCode.trim()) return;
    
    try {
      const response = await fetch(`http://localhost:8787/match/${joinCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
      });
      
      const data = await response.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      
      useGameStore.getState().setMatchInfo(data.matchId, data.userId);
      socketManager.joinMatch(data.matchId, displayName, data.userId);
    } catch (error) {
      console.error('Failed to join match:', error);
    }
  };

  const handleStartGame = () => {
    if (matchId) {
      socketManager.startGame(matchId);
    }
  };

  if (view?.status === 'LOBBY') {
    const players = Object.values(view.players);
    const isHost = view.yourSeat === 0;
    const canStart = players.length >= 4 && isHost;

    return (
      <div className="container">
        <div className="card" style={{ maxWidth: '600px', margin: '50px auto' }}>
          <h2>Game Lobby</h2>
          <p style={{ marginTop: '10px', opacity: 0.7 }}>
            Game Code: <strong style={{ fontSize: '20px' }}>{matchId}</strong>
          </p>
          
          <div style={{ marginTop: '30px' }}>
            <h3>Players ({players.length}/8)</h3>
            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {players.map((player) => (
                <div 
                  key={player.seat}
                  style={{ 
                    padding: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{player.displayName}</span>
                  {player.seat === 0 && <span style={{ opacity: 0.7 }}>Host</span>}
                  {player.seat === view.yourSeat && <span style={{ opacity: 0.7 }}>You</span>}
                </div>
              ))}
              
              {Array.from({ length: 8 - players.length }).map((_, i) => (
                <div 
                  key={`empty-${i}`}
                  style={{ 
                    padding: '10px',
                    border: '1px dashed rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    opacity: 0.3,
                    textAlign: 'center'
                  }}
                >
                  Waiting for player...
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
            {isHost && (
              <button 
                onClick={handleStartGame}
                disabled={!canStart}
                style={{ flex: 1, padding: '12px' }}
              >
                {canStart ? 'Start Game' : `Need ${4 - players.length} more players`}
              </button>
            )}
            {!isHost && (
              <div style={{ flex: 1, padding: '12px', textAlign: 'center', opacity: 0.7 }}>
                Waiting for host to start game...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '500px', margin: '50px auto' }}>
        <h2>Join or Create Game</h2>
        
        <div style={{ marginTop: '20px' }}>
          <input
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ width: '100%', marginBottom: '20px' }}
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <button 
                onClick={handleCreateMatch}
                disabled={!displayName.trim() || isCreating}
                style={{ width: '100%', padding: '12px' }}
              >
                Create New Game
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Game code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                style={{ flex: 1 }}
              />
              <button 
                onClick={handleJoinMatch}
                disabled={!displayName.trim() || !joinCode.trim()}
              >
                Join Game
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Lobby;