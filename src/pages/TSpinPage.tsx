import React, { useState, useCallback } from 'react';
import { useGame } from '../contexts/GameContext';
import { BoardRenderer } from '../game/renderer/Board';

// T-Spin practice setups
const TSPIN_SETUPS = [
  {
    name: 'TSS (T-Spin Single)',
    description: 'Basic T-Spin Single setup',
    difficulty: 'Beginner',
    board: 'simplified_setup_1',
  },
  {
    name: 'TSD (T-Spin Double)',
    description: 'Standard T-Spin Double setup',
    difficulty: 'Intermediate',
    board: 'simplified_setup_2',
  },
  {
    name: 'TST (T-Spin Triple)',
    description: 'Advanced T-Spin Triple setup',
    difficulty: 'Advanced',
    board: 'simplified_setup_3',
  },
  {
    name: 'Trinity',
    description: 'Trinity T-Spin setup',
    difficulty: 'Expert',
    board: 'simplified_setup_4',
  },
];

export const TSpinPage: React.FC = () => {
  const { state, actions } = useGame();
  const [selectedSetup, setSelectedSetup] = useState(0);
  const [tsdDetected, setTsdDetected] = useState(false);
  const [rotationSuccess, setRotationSuccess] = useState(false);
  const [bottomHolesFilled, setBottomHolesFilled] = useState(false);

  // @ts-ignore
  const checkTSDConditions = useCallback((): void => {
    // TSd detection logic:
    // 1. Successful rotation input
    // 2. Bottom hole remains unfilled
    
    // TODO: Implement actual T-Spin detection logic
    // This is a simplified version for demonstration
    
    if (state.gameState.currentPiece?.type === 'T') {
      // Check if T-piece is in a valid T-Spin position
      // Check if bottom holes are unfilled
      // Set detection flags accordingly
      setTsdDetected(rotationSuccess && !bottomHolesFilled);
    }
  }, [state.gameState.currentPiece, rotationSuccess, bottomHolesFilled]);

  const handleSetupSelect = useCallback((index: number) => {
    setSelectedSetup(index);
    // TODO: Load the actual board setup
    actions.resetGame();
    setTsdDetected(false);
    setRotationSuccess(false);
    setBottomHolesFilled(false);
  }, [actions]);

  const handleStartPractice = useCallback(() => {
    actions.startGame();
  }, [actions]);

  return (
    <div className="tspin-page">
      <div className="tspin-header">
        <h2>🔄 T-Spin Training</h2>
        <div className="tspin-status">
          <div className={`status-indicator ${tsdDetected ? 'success' : 'inactive'}`}>
            {tsdDetected ? '✅ TSd Detected!' : '⏳ Setup T-Spin...'}
          </div>
        </div>
      </div>

      <div className="tspin-content">
        <div className="board-section">
          <BoardRenderer
            board={state.gameState.board}
            currentPiece={state.gameState.currentPiece}
            nextPieces={state.gameState.nextPieces}
            heldPiece={state.gameState.heldPiece}
            showGhost={true}
          />
        </div>

        <div className="tspin-controls">
          <div className="setup-selection">
            <h3>T-Spin Setups</h3>
            {TSPIN_SETUPS.map((setup, index) => (
              <div
                key={index}
                className={`setup-item ${selectedSetup === index ? 'active' : ''}`}
                onClick={() => handleSetupSelect(index)}
              >
                <div className="setup-header">
                  <span className="setup-name">{setup.name}</span>
                  <span className={`difficulty ${setup.difficulty.toLowerCase()}`}>
                    {setup.difficulty}
                  </span>
                </div>
                <div className="setup-description">{setup.description}</div>
              </div>
            ))}
          </div>

          <div className="action-buttons">
            <button className="start-btn" onClick={handleStartPractice}>
              🎯 Start Practice
            </button>
          </div>

          <div className="detection-panel">
            <h3>TSd Detection</h3>
            <div className="detection-criteria">
              <div className={`criterion ${rotationSuccess ? 'met' : 'unmet'}`}>
                <span>🔄 Rotation Input</span>
                <span>{rotationSuccess ? '✅' : '❌'}</span>
              </div>
              <div className={`criterion ${!bottomHolesFilled ? 'met' : 'unmet'}`}>
                <span>🕳️ Bottom Holes Unfilled</span>
                <span>{!bottomHolesFilled ? '✅' : '❌'}</span>
              </div>
            </div>
          </div>

          <div className="tspin-guide">
            <h3>T-Spin Guide</h3>
            <ul>
              <li>Position T-piece in the setup</li>
              <li>Rotate to fit into the slot</li>
              <li>Ensure bottom holes remain empty</li>
              <li>Clear lines with T-Spin bonus</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};