import React, { useState, useCallback } from 'react';
import { useGame } from '../contexts/GameContext';
import { BoardRenderer } from '../game/renderer/Board';

// REN practice preset boards
const REN_PRESETS = [
  {
    name: 'TKI-3',
    description: 'Basic TKI-3 setup for REN practice',
    board: [
      // Simplified representation - in reality this would be a full 40x10 board
      'GGGGGGGGGG',
      'GGGGGGGGGG',
      'GGGGJJGGGG',
      'GGJJJJGGGG',
      'GGJJJJJGGG',
      'GGLLLLLLGG',
      'GZZZLLSSSG',
      'ZZZLLSSSSG',
      'ZZZOOSSSBG',
      'ZZZOOSSSBB',
    ],
  },
  {
    name: 'LST Stacking',
    description: 'LST stacking pattern for high REN',
    board: [
      'GGGGGGGGGG',
      'GGGGGGGGGG',
      'GGGGGGGGGG',
      'GGGGGGGGGG',
      'GGGGGGGGGG',
      'GGGGGGGGGG',
      'JJJJGGGGGG',
      'JJJJGGLLLL',
      'JJSSGGLLLL',
      'SSSSGGLLLL',
    ],
  },
];

export const RenPage: React.FC = () => {
  const { state, actions } = useGame();
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [renCount, setRenCount] = useState(0);
  const [maxRen] = useState(0);

  const handleStartPractice = useCallback(() => {
    // TODO: Convert preset.board string array to actual board format
    // For now, just reset the game
    actions.resetGame();
    actions.startGame();
    setRenCount(0);
  }, [selectedPreset, actions]);

  const handleRandomStart = useCallback(() => {
    const randomPreset = Math.floor(Math.random() * REN_PRESETS.length);
    setSelectedPreset(randomPreset);
    handleStartPractice();
  }, [handleStartPractice]);

  return (
    <div className="ren-page">
      <div className="ren-header">
        <h2>🔥 REN Practice</h2>
        <div className="ren-stats">
          <div className="stat-box">
            <span className="stat-label">Current REN</span>
            <span className="stat-value">{renCount}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Max REN</span>
            <span className="stat-value">{maxRen}</span>
          </div>
        </div>
      </div>

      <div className="ren-content">
        <div className="board-section">
          <BoardRenderer
            board={state.gameState.board}
            currentPiece={state.gameState.currentPiece}
            nextPieces={state.gameState.nextPieces}
            heldPiece={state.gameState.heldPiece}
            showGhost={true}
          />
        </div>

        <div className="ren-controls">
          <div className="preset-selection">
            <h3>Starting Position</h3>
            {REN_PRESETS.map((preset, index) => (
              <div
                key={index}
                className={`preset-item ${selectedPreset === index ? 'active' : ''}`}
                onClick={() => setSelectedPreset(index)}
              >
                <div className="preset-name">{preset.name}</div>
                <div className="preset-description">{preset.description}</div>
              </div>
            ))}
          </div>

          <div className="action-buttons">
            <button className="start-btn" onClick={handleStartPractice}>
              🎯 Start Practice
            </button>
            <button className="random-btn" onClick={handleRandomStart}>
              🎲 Random Start
            </button>
          </div>

          <div className="ren-tips">
            <h3>REN Tips</h3>
            <ul>
              <li>Focus on maintaining clean stacking</li>
              <li>Keep the well on the right side</li>
              <li>Build donations for higher REN counts</li>
              <li>Practice common REN patterns</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};