import { useGameStore } from '../state/store';

function PlayerInfo() {
  const { view } = useGameStore();
  
  if (!view || view.yourSeat === undefined) return null;
  
  const you = view.players[view.yourSeat];
  const character = view.yourCharacter;

  return (
    <div>
      <h3 style={{ marginBottom: '15px' }}>Your Character</h3>
      
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '15px',
        borderRadius: '8px'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {you.displayName}
          </div>
          {character && (
            <div style={{ 
              marginTop: '5px',
              padding: '5px 10px',
              background: character.faction === 'HUNTER' 
                ? 'rgba(100, 149, 237, 0.2)'
                : character.faction === 'SHADOW'
                  ? 'rgba(139, 69, 19, 0.2)'
                  : 'rgba(128, 128, 128, 0.2)',
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              {character.name} • {character.faction}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>HP:</span>
          <span>{you.hp} / {character?.maxHp || '??'}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>Status:</span>
          <span>{you.revealed ? 'Revealed' : 'Hidden'}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>Position:</span>
          <span>{view.areas[you.position]?.name}</span>
        </div>
        
        {you.equipment.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Equipment:</div>
            {you.equipment.map((eq, i) => (
              <div key={i} style={{ 
                padding: '5px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '4px',
                marginBottom: '5px',
                fontSize: '12px'
              }}>
                {eq}
              </div>
            ))}
          </div>
        )}
        
        {character?.abilities && character.abilities.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Abilities:</div>
            {character.abilities.map((ability: any) => (
              <div key={ability.id} style={{ 
                padding: '5px',
                background: 'rgba(255, 215, 0, 0.05)',
                borderRadius: '4px',
                marginBottom: '5px',
                fontSize: '12px'
              }}>
                <strong>{ability.name}:</strong> {ability.description}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerInfo;