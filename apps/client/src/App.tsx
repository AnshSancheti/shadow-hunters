import { useEffect, useState } from 'react';
import { useGameStore } from './state/store';
import { socketManager } from './api/socket';
import Lobby from './pages/Lobby';
import Table from './pages/Table';

function App() {
  const { view, connected } = useGameStore();
  const [displayName, setDisplayName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [page, setPage] = useState<'name' | 'menu' | 'lobby' | 'game'>('name');

  useEffect(() => {
    socketManager.connect();
    return () => {
      socketManager.disconnect();
    };
  }, []);

  useEffect(() => {
    if (view) {
      if (view.status === 'ACTIVE' || view.status === 'ENDED') {
        setPage('game');
      } else if (view.status === 'LOBBY') {
        setPage('lobby');
      }
    }
  }, [view]);

  const handleCreateGame = async () => {
    if (!displayName.trim()) return;
    
    try {
      const response = await fetch('http://localhost:8787/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
      });
      
      const data = await response.json();
      useGameStore.getState().setMatchInfo(data.matchId, data.userId);
      socketManager.joinMatch(data.matchId, displayName, data.userId);
      setGameCode(data.matchId);
    } catch (error) {
      console.error('Failed to create match:', error);
      alert('Failed to create game. Please try again.');
    }
  };

  const handleJoinGame = async () => {
    if (!displayName.trim() || !gameCode.trim()) return;
    
    try {
      const response = await fetch(`http://localhost:8787/match/${gameCode}/join`, {
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
      alert('Failed to join game. Please check the code and try again.');
    }
  };

  if (!connected) {
    return (
      <div className="container">
        <div className="card" style={{ marginTop: '100px', textAlign: 'center' }}>
          <h2>Connecting to server...</h2>
          <p style={{ marginTop: '10px', opacity: 0.7 }}>
            Make sure the server is running on port 8787
          </p>
        </div>
      </div>
    );
  }

  if (page === 'game' && view) {
    return <Table />;
  }

  if (page === 'lobby' && view) {
    return <Lobby displayName={displayName} />;
  }

  if (page === 'name') {
    return (
      <div className="container">
        <div className="card" style={{ marginTop: '100px', maxWidth: '400px', margin: '100px auto' }}>
          <h1 style={{ marginBottom: '30px', textAlign: 'center' }}>Shadow Hunters Online</h1>
          
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '10px' }}>Enter your name:</label>
            <input
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && displayName.trim() && setPage('menu')}
              style={{ width: '100%', padding: '12px', fontSize: '16px' }}
              autoFocus
            />
          </div>
          
          <button 
            onClick={() => setPage('menu')}
            disabled={!displayName.trim()}
            style={{ width: '100%', padding: '15px', fontSize: '16px' }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (page === 'menu') {
    return (
      <div className="container">
        <div className="card" style={{ marginTop: '100px', maxWidth: '500px', margin: '100px auto' }}>
          <h1 style={{ marginBottom: '10px', textAlign: 'center' }}>Shadow Hunters Online</h1>
          <p style={{ marginBottom: '30px', textAlign: 'center', opacity: 0.7 }}>
            Welcome, {displayName}!
          </p>
          
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <button 
              onClick={handleCreateGame}
              style={{ padding: '15px', fontSize: '16px' }}
            >
              Create New Game
            </button>
            
            <div style={{ 
              padding: '20px', 
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              marginTop: '10px'
            }}>
              <label style={{ display: 'block', marginBottom: '10px' }}>Join existing game:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Enter 4-letter code"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase().slice(0, 4))}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
                  style={{ 
                    flex: 1, 
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    fontSize: '18px',
                    textAlign: 'center'
                  }}
                  maxLength={4}
                />
                <button 
                  onClick={handleJoinGame}
                  disabled={!gameCode.trim()}
                >
                  Join Game
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setDisplayName('');
                setPage('name');
              }}
              style={{ 
                marginTop: '20px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                opacity: 0.7
              }}
            >
              Change Name
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default App;