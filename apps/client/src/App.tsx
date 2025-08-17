import { useEffect, useState } from 'react';
import { useGameStore } from './state/store';
import { socketManager } from './api/socket';
import Lobby from './pages/Lobby';
import Table from './pages/Table';

function App() {
  const { view, connected } = useGameStore();
  const [page, setPage] = useState<'home' | 'lobby' | 'game'>('home');

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

  if (page === 'lobby') {
    return <Lobby onStartGame={() => setPage('game')} />;
  }

  return (
    <div className="container">
      <div className="card" style={{ marginTop: '100px', maxWidth: '500px', margin: '100px auto' }}>
        <h1 style={{ marginBottom: '30px', textAlign: 'center' }}>Shadow Hunters Online</h1>
        
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          <button 
            onClick={() => setPage('lobby')}
            style={{ padding: '15px', fontSize: '16px' }}
          >
            Create New Game
          </button>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Enter Game Code"
              style={{ flex: 1 }}
              id="gameCode"
            />
            <button 
              onClick={() => {
                const input = document.getElementById('gameCode') as HTMLInputElement;
                if (input.value) {
                  setPage('lobby');
                }
              }}
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;