import { useGameStore } from '../state/store';
import { socketManager } from '../api/socket';

function ActionRail() {
  const { view } = useGameStore();
  
  if (!view || !view.legalActions) return null;

  const handleAction = (action: any) => {
    switch (action.type) {
      case 'ROLL_AND_MOVE':
        socketManager.rollAndMove();
        break;
      
      case 'CHOOSE_AREA':
        socketManager.chooseArea(action.params.areaId);
        break;
      
      case 'DO_AREA_ACTION':
        socketManager.doAreaAction(action.params.action);
        break;
      
      case 'ATTACK':
        socketManager.attack(action.params.targetSeat);
        break;
      
      case 'END_TURN':
        socketManager.endTurn();
        break;
      
      case 'REVEAL_IDENTITY':
        socketManager.revealIdentity();
        break;
    }
  };

  const groupedActions: Record<string, any[]> = {};
  
  view.legalActions.forEach(action => {
    const baseType = action.type.replace(/_.*/, '');
    if (!groupedActions[baseType]) {
      groupedActions[baseType] = [];
    }
    groupedActions[baseType].push(action);
  });

  return (
    <div>
      <h3 style={{ marginBottom: '15px' }}>Available Actions</h3>
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {view.phase === 'MOVE' && groupedActions['ROLL'] && (
          <button 
            onClick={() => handleAction(groupedActions['ROLL'][0])}
            style={{ padding: '10px 20px' }}
          >
            Roll Dice & Move
          </button>
        )}
        
        {view.phase === 'MOVE' && groupedActions['CHOOSE'] && (
          <>
            <span style={{ alignSelf: 'center' }}>Choose area to move to:</span>
            {groupedActions['CHOOSE'].map((action, i) => (
              <button 
                key={i}
                onClick={() => handleAction(action)}
                style={{ padding: '10px 15px' }}
              >
                {view.areas[action.params.areaId as any]?.name}
              </button>
            ))}
          </>
        )}
        
        {view.phase === 'AREA' && groupedActions['DO'] && (
          <>
            {groupedActions['DO'].map((action, i) => {
              const actionType = action.params.action.type;
              let label = actionType;
              
              if (actionType === 'SKIP') label = 'Skip Area Action';
              else if (actionType === 'DRAW_WHITE') label = 'Draw White Card';
              else if (actionType === 'DRAW_BLACK') label = 'Draw Black Card';
              else if (actionType === 'DRAW_HERMIT') {
                const target = view.players[action.params.action.targetSeat];
                label = `Give Hermit to ${target?.displayName}`;
              }
              else if (actionType === 'HEAL') {
                const target = view.players[action.params.action.targetSeat];
                label = `Heal ${target?.displayName} (1 HP)`;
              }
              else if (actionType === 'DAMAGE') {
                const target = view.players[action.params.action.targetSeat];
                label = `Damage ${target?.displayName} (2 HP)`;
              }
              else if (actionType === 'STEAL_EQUIPMENT') {
                const target = view.players[action.params.action.targetSeat];
                label = `Steal from ${target?.displayName}`;
              }
              
              return (
                <button 
                  key={i}
                  onClick={() => handleAction(action)}
                  style={{ padding: '10px 15px' }}
                >
                  {label}
                </button>
              );
            })}
          </>
        )}
        
        {view.phase === 'ATTACK' && (
          <>
            {groupedActions['ATTACK'] && groupedActions['ATTACK'].length > 0 && (
              <>
                <span style={{ alignSelf: 'center' }}>Attack:</span>
                {groupedActions['ATTACK'].map((action, i) => {
                  const target = view.players[action.params.targetSeat];
                  return (
                    <button 
                      key={i}
                      onClick={() => handleAction(action)}
                      style={{ padding: '10px 15px' }}
                    >
                      {target?.displayName} (HP: {target?.hp})
                    </button>
                  );
                })}
              </>
            )}
            
            {groupedActions['END'] && (
              <button 
                onClick={() => handleAction(groupedActions['END'][0])}
                style={{ padding: '10px 20px' }}
              >
                {groupedActions['ATTACK']?.length > 0 ? 'Skip Attack' : 'End Turn'}
              </button>
            )}
          </>
        )}
        
        {groupedActions['REVEAL'] && (
          <button 
            onClick={() => handleAction(groupedActions['REVEAL'][0])}
            style={{ 
              padding: '10px 20px',
              background: 'rgba(255, 215, 0, 0.2)',
              border: '1px solid gold'
            }}
          >
            Reveal Identity
          </button>
        )}
      </div>
    </div>
  );
}

export default ActionRail;