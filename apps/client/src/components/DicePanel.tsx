import type { DiceRoll } from '@shadow-hunters/shared';

interface DicePanelProps {
  roll: DiceRoll;
}

function DicePanel({ roll }: DicePanelProps) {
  return (
    <div>
      <h3 style={{ marginBottom: '15px' }}>Last Roll</h3>
      
      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
        <div style={{ 
          width: '60px',
          height: '60px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          {roll.d6}
        </div>
        
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          fontSize: '20px'
        }}>
          +
        </div>
        
        <div style={{ 
          width: '60px',
          height: '60px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
          transform: 'rotate(45deg)'
        }}>
          <span style={{ transform: 'rotate(-45deg)' }}>{roll.d4}</span>
        </div>
        
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          fontSize: '20px'
        }}>
          =
        </div>
        
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          fontSize: '28px',
          fontWeight: 'bold',
          color: roll.sum === 7 ? 'gold' : 'white'
        }}>
          {roll.sum}
        </div>
      </div>
      
      {roll.difference !== undefined && (
        <div style={{ 
          marginTop: '10px',
          textAlign: 'center',
          opacity: 0.7,
          fontSize: '14px'
        }}>
          Attack Damage: {roll.difference}
        </div>
      )}
    </div>
  );
}

export default DicePanel;