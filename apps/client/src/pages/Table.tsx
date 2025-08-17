import { useGameStore } from '../state/store';
import { socketManager } from '../api/socket';
import GameBoard from '../components/GameBoard';
import ActionRail from '../components/ActionRail';
import PlayerInfo from '../components/PlayerInfo';
import DicePanel from '../components/DicePanel';
import GameLog from '../components/GameLog';

function Table() {
  const { view } = useGameStore();

  if (!view) {
    return <div>Loading game...</div>;
  }

  const isYourTurn = view.yourSeat === view.activeSeat;

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
    }}>
      {/* Main Game Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <div style={{ 
          padding: '10px 20px',
          background: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0 }}>Shadow Hunters</h3>
            <p style={{ margin: '5px 0 0 0', opacity: 0.7, fontSize: '14px' }}>
              Round {view.round} • {view.phase} Phase
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {view.status === 'ENDED' && view.winners && (
              <div style={{ 
                padding: '10px 20px',
                background: 'rgba(255, 215, 0, 0.2)',
                borderRadius: '4px',
                border: '1px solid gold'
              }}>
                Game Over! {view.winningFaction ? `${view.winningFaction}S WIN` : 'Winners declared'}
              </div>
            )}
            
            {isYourTurn && view.status === 'ACTIVE' && (
              <div style={{ 
                padding: '5px 10px',
                background: 'rgba(76, 175, 80, 0.2)',
                borderRadius: '4px',
                border: '1px solid #4caf50'
              }}>
                Your Turn
              </div>
            )}
          </div>
        </div>

        {/* Game Board */}
        <div style={{ flex: 1, padding: '20px' }}>
          <GameBoard />
        </div>

        {/* Action Rail */}
        {isYourTurn && view.status === 'ACTIVE' && (
          <div style={{ 
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <ActionRail />
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div style={{ 
        width: '350px',
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Your Character Info */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <PlayerInfo />
        </div>

        {/* Dice Panel */}
        {view.lastDiceRoll && (
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <DicePanel roll={view.lastDiceRoll} />
          </div>
        )}

        {/* Game Log */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <GameLog />
        </div>
      </div>
    </div>
  );
}

export default Table;