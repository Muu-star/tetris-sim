import React, { useState, useCallback } from 'react';
import { useGame } from '../contexts/GameContext';
import { BoardRenderer } from '../game/renderer/Board';
import { createProblem, createSolution } from '../lib/persist';
import type { PieceType } from '../game/types';
import './SimulationPage.css';

type EditorMode = 'view' | 'edit' | 'play' | 'replay';

export const SimulationPage: React.FC = () => {
  const { state, actions } = useGame();
  const [mode, setMode] = useState<EditorMode>('view');
  const [selectedPiece, setSelectedPiece] = useState<PieceType>('I');
  const [problemTitle, setProblemTitle] = useState('');
  const [problemTags, setProblemTags] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (mode !== 'edit') return;

    const newBoard = [...state.gameState.board];
    const currentCell = newBoard[row][col];
    
    // Toggle between empty and selected piece
    newBoard[row][col] = currentCell === 0 ? selectedPiece : 0;
    actions.setBoard(newBoard);
  }, [mode, selectedPiece, state.gameState.board, actions]);

  const handleStartRecording = useCallback(() => {
    if (mode !== 'play') return;
    
    setIsRecording(true);
    setStartTime(Date.now());
    actions.clearMoves();
    actions.startGame();
  }, [mode, actions]);

  const handleStopRecording = useCallback(async () => {
    if (!isRecording || !startTime) return;
    
    setIsRecording(false);
    actions.pauseGame();
    
    const duration = Date.now() - startTime;
    const moves = state.recordedMoves.map(move => ({
      action: move.action,
      timestamp: move.timestamp,
      pieceType: move.pieceType,
    }));

    try {
      // Save solution if we have recorded moves
      if (moves.length > 0) {
        await createSolution({
          problemId: 'current-problem', // TODO: Track current problem ID
          steps: moves,
          durationMs: duration,
          solverName: 'Player',
        });
        console.log('Solution saved successfully');
      }
    } catch (error) {
      console.error('Failed to save solution:', error);
    }

    setStartTime(null);
  }, [isRecording, startTime, state.recordedMoves, actions]);

  const handleSaveProblem = useCallback(async () => {
    if (!problemTitle.trim()) {
      alert('Please enter a problem title');
      return;
    }

    try {
      const tags = problemTags.split(',').map(tag => tag.trim()).filter(Boolean);
      const boardString = state.gameState.board.map(row => 
        row.map(cell => cell || '0').join('')
      ).join('\n');

      await createProblem({
        title: problemTitle,
        tags: tags,
        fumen: boardString, // TODO: Convert to proper fumen format
        description: `Created in Simulation mode`,
        author: 'Simulation Editor',
      });

      alert('Problem saved successfully!');
      setProblemTitle('');
      setProblemTags('');
    } catch (error) {
      console.error('Failed to save problem:', error);
      alert('Failed to save problem');
    }
  }, [problemTitle, problemTags, state.gameState.board]);

  const handleClearBoard = useCallback(() => {
    actions.resetGame();
  }, [actions]);

  const pieceTypes: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

  return (
    <div className="simulation-page">
      <div className="simulation-header">
        <h2>Simulation Mode</h2>
        <div className="mode-controls">
          <button 
            className={`mode-btn ${mode === 'view' ? 'active' : ''}`}
            onClick={() => setMode('view')}
          >
            👁️ View
          </button>
          <button 
            className={`mode-btn ${mode === 'edit' ? 'active' : ''}`}
            onClick={() => setMode('edit')}
          >
            ✏️ Edit
          </button>
          <button 
            className={`mode-btn ${mode === 'play' ? 'active' : ''}`}
            onClick={() => setMode('play')}
          >
            🎮 Play
          </button>
          <button 
            className={`mode-btn ${mode === 'replay' ? 'active' : ''}`}
            onClick={() => setMode('replay')}
          >
            ⏯️ Replay
          </button>
        </div>
      </div>

      <div className="simulation-content">
        <div className="board-section">
          <BoardRenderer
            board={state.gameState.board}
            currentPiece={state.gameState.currentPiece}
            nextPieces={state.gameState.nextPieces}
            heldPiece={state.gameState.heldPiece}
            showGhost={mode === 'play'}
            onCellClick={mode === 'edit' ? handleCellClick : undefined}
          />
        </div>

        <div className="controls-section">
          {mode === 'edit' && (
            <div className="edit-controls">
              <h3>Edit Mode</h3>
              <div className="piece-selector">
                <label>Select Piece:</label>
                <div className="piece-buttons">
                  {pieceTypes.map(piece => (
                    <button
                      key={piece}
                      className={`piece-btn ${selectedPiece === piece ? 'active' : ''}`}
                      onClick={() => setSelectedPiece(piece)}
                    >
                      {piece}
                    </button>
                  ))}
                </div>
              </div>
              <button className="clear-btn" onClick={handleClearBoard}>
                Clear Board
              </button>
            </div>
          )}

          {mode === 'play' && (
            <div className="play-controls">
              <h3>Play Mode</h3>
              <div className="recording-controls">
                {!isRecording ? (
                  <button className="record-btn" onClick={handleStartRecording}>
                    🔴 Start Recording
                  </button>
                ) : (
                  <div>
                    <button className="stop-btn" onClick={handleStopRecording}>
                      ⏹️ Stop Recording
                    </button>
                    <div className="recording-indicator">
                      Recording... ({state.recordedMoves.length} moves)
                    </div>
                  </div>
                )}
              </div>
              <div className="game-info">
                <div>Moves: {state.currentMoveCount}</div>
                <div>Lines: {state.gameState.lines}</div>
                <div>Score: {state.gameState.score}</div>
              </div>
            </div>
          )}

          <div className="save-controls">
            <h3>Save Problem</h3>
            <div className="input-group">
              <label>Title:</label>
              <input
                type="text"
                value={problemTitle}
                onChange={(e) => setProblemTitle(e.target.value)}
                placeholder="Enter problem title"
              />
            </div>
            <div className="input-group">
              <label>Tags:</label>
              <input
                type="text"
                value={problemTags}
                onChange={(e) => setProblemTags(e.target.value)}
                placeholder="Enter tags (comma separated)"
              />
            </div>
            <button className="save-btn" onClick={handleSaveProblem}>
              💾 Save Problem
            </button>
          </div>

          <div className="stats-section">
            <h3>Statistics</h3>
            <div className="stat-item">
              <span>Persistence:</span>
              <span className={state.isPersistenceReady ? 'status-ready' : 'status-error'}>
                {state.isPersistenceReady ? 'Ready' : 'Error'}
              </span>
            </div>
            <div className="stat-item">
              <span>Game State:</span>
              <span>{state.isPlaying ? 'Playing' : 'Paused'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};