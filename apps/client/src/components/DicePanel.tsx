import type { DiceRoll } from '@shadow-hunters/shared';

interface DicePanelProps {
  roll: DiceRoll;
  context?: 'MOVE' | 'ATTACK';
}

function DicePanel({ roll, context = 'MOVE' }: DicePanelProps) {
  const isAttack = context === 'ATTACK';
  
  return (
    <div>
      <h3 style={{ marginBottom: '15px' }}>
        {isAttack ? 'Attack Roll' : 'Movement Roll'}
      </h3>
      
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
          {isAttack ? '-' : '+'}
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
          color: isAttack ? 'white' : (roll.sum === 7 ? 'gold' : 'white')
        }}>
          {isAttack ? roll.difference : roll.sum}
          {isAttack && <span style={{ fontSize: '16px', marginLeft: '8px' }}>damage</span>}
        </div>
      </div>
    </div>
  );
}

export default DicePanel;