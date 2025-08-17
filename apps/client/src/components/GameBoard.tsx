import { useGameStore } from '../state/store';
import type { AreaId } from '@shadow-hunters/shared';

function GameBoard() {
  const { view } = useGameStore();
  
  if (!view) return null;

  const areas = [
    { id: 'HERMIT_CABIN', row: 0, col: 0 },
    { id: 'UNDERWORLD_GATE', row: 0, col: 1 },
    { id: 'CHURCH', row: 1, col: 0 },
    { id: 'CEMETERY', row: 1, col: 1 },
    { id: 'WEIRD_WOODS', row: 2, col: 0 },
    { id: 'ERSTWHILE_ALTAR', row: 2, col: 1 }
  ];

  const getPlayersInArea = (areaId: AreaId) => {
    return Object.values(view.players).filter(p => p.position === areaId);
  };
  
  const playersOutsideAreas = Object.values(view.players).filter(p => p.position === null);

  return (
    <div>
      {/* Players outside any area */}
      {playersOutsideAreas.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '2px dashed rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', opacity: 0.7 }}>
            Outside any location (roll dice to enter the board)
          </h3>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center'
          }}>
            {playersOutsideAreas.map(player => (
              <div
                key={player.seat}
                style={{
                  padding: '5px 10px',
                  background: player.seat === view.yourSeat 
                    ? 'rgba(76, 175, 80, 0.3)' 
                    : player.alive 
                      ? 'rgba(100, 149, 237, 0.3)' 
                      : 'rgba(255, 0, 0, 0.2)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  border: player.seat === view.activeSeat 
                    ? '2px solid yellow' 
                    : '1px solid transparent'
                }}
              >
                <div>{player.displayName}</div>
                <div style={{ fontSize: '10px', opacity: 0.8 }}>
                  HP: {player.hp} {player.revealed && `• ${player.faction}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Game board areas */}
      <div style={{ 
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: 'repeat(3, 1fr)',
      gap: '20px',
      height: '100%',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {areas.map(({ id, row, col }) => {
        const area = view.areas[id as AreaId];
        const players = getPlayersInArea(id as AreaId);
        
        return (
          <div
            key={id}
            style={{
              gridRow: row + 1,
              gridColumn: col + 1,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '15px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>{area?.name}</h3>
              <p style={{ margin: '5px 0 0 0', opacity: 0.7, fontSize: '12px' }}>
                Roll {area?.range[0]}-{area?.range[1] === area?.range[0] ? '' : area?.range[1]}
              </p>
              {area?.action.type !== 'NONE' && (
                <p style={{ margin: '5px 0 0 0', opacity: 0.7, fontSize: '12px' }}>
                  {area.action.description}
                </p>
              )}
            </div>
            
            <div style={{ 
              flex: 1,
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              alignContent: 'flex-start'
            }}>
              {players.map(player => (
                <div
                  key={player.seat}
                  style={{
                    padding: '5px 10px',
                    background: player.seat === view.yourSeat 
                      ? 'rgba(76, 175, 80, 0.3)' 
                      : player.alive 
                        ? 'rgba(100, 149, 237, 0.3)' 
                        : 'rgba(255, 0, 0, 0.2)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    border: player.seat === view.activeSeat 
                      ? '2px solid yellow' 
                      : '1px solid transparent'
                  }}
                >
                  <div>{player.displayName}</div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>
                    HP: {player.hp} {player.revealed && `• ${player.faction}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default GameBoard;
