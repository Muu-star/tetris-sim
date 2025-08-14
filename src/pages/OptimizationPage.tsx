import React, { useState, useCallback, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { BoardRenderer } from '../game/renderer/Board';
import { loadProblem, getBestSolution } from '../lib/persist';
import type { Problem, Solution } from '../lib/persist/types';

export const OptimizationPage: React.FC = () => {
  const { state, actions } = useGame();
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [optimalSolution, setOptimalSolution] = useState<Solution | null>(null);
  const [moveDifference, setMoveDifference] = useState(0);
  const [violationCount, setViolationCount] = useState(0);
  const [, setUndoHistory] = useState<number[]>([]);

  // Audio feedback for violations
  const playViolationSound = useCallback(() => {
    // Create a simple beep sound for move violations
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }, []);

  const checkOptimalityViolation = useCallback(() => {
    if (!optimalSolution) return;
    
    const optimalMoves = optimalSolution.steps.length;
    const currentMoves = state.currentMoveCount;
    const difference = currentMoves - optimalMoves;
    
    setMoveDifference(difference);
    
    // Trigger violation sound if we exceed optimal moves
    if (difference > 0 && difference > moveDifference) {
      setViolationCount(prev => prev + 1);
      playViolationSound();
    }
  }, [optimalSolution, state.currentMoveCount, moveDifference, playViolationSound]);

  const handleUndo = useCallback(() => {
    if (state.currentMoveCount > 0) {
      actions.undoMove();
      setUndoHistory(prev => [...prev, state.currentMoveCount]);
    }
  }, [state.currentMoveCount, actions]);

  const handleReset = useCallback(() => {
    actions.resetGame();
    if (currentProblem) {
      // TODO: Load the problem's initial board state
    }
    setMoveDifference(0);
    setViolationCount(0);
    setUndoHistory([]);
  }, [actions, currentProblem]);

  // @ts-ignore
  const loadProblemForOptimization = useCallback(async (problemId: string) => {
    try {
      const problemResult = await loadProblem(problemId);
      if (problemResult.success && problemResult.data) {
        setCurrentProblem(problemResult.data);
        
        // Load the best solution for comparison
        const bestSolutionResult = await getBestSolution(problemId);
        if (bestSolutionResult.success && bestSolutionResult.data) {
          setOptimalSolution(bestSolutionResult.data);
        }
        
        // Reset game state
        handleReset();
      }
    } catch (error) {
      console.error('Failed to load problem:', error);
    }
  }, [handleReset]);

  useEffect(() => {
    checkOptimalityViolation();
  }, [state.currentMoveCount, checkOptimalityViolation]);

  const getPerformanceStatus = () => {
    if (!optimalSolution) return 'unknown';
    if (moveDifference === 0) return 'optimal';
    if (moveDifference <= 2) return 'good';
    if (moveDifference <= 5) return 'acceptable';
    return 'poor';
  };

  return (
    <div className="optimization-page">
      <div className="optimization-header">
        <h2>⚡ Optimization Challenge</h2>
        <div className="performance-indicator">
          <div className={`status-badge ${getPerformanceStatus()}`}>
            {moveDifference === 0 ? 'OPTIMAL' : 
             moveDifference > 0 ? `+${moveDifference} moves` : 
             `${moveDifference} moves`}
          </div>
        </div>
      </div>

      <div className="optimization-content">
        <div className="board-section">
          <BoardRenderer
            board={state.gameState.board}
            currentPiece={state.gameState.currentPiece}
            nextPieces={state.gameState.nextPieces}
            heldPiece={state.gameState.heldPiece}
            showGhost={true}
          />
        </div>

        <div className="optimization-controls">
          <div className="problem-info">
            <h3>Current Problem</h3>
            {currentProblem ? (
              <div className="problem-details">
                <div className="problem-title">{currentProblem.title}</div>
                <div className="problem-tags">
                  {currentProblem.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-problem">No problem loaded</div>
            )}
          </div>

          <div className="optimization-stats">
            <h3>Performance Metrics</h3>
            <div className="stat-grid">
              <div className="stat-item">
                <span className="stat-label">Current Moves:</span>
                <span className="stat-value">{state.currentMoveCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Optimal Moves:</span>
                <span className="stat-value">
                  {optimalSolution ? optimalSolution.steps.length : '?'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Difference:</span>
                <span className={`stat-value ${moveDifference > 0 ? 'over' : moveDifference < 0 ? 'under' : 'optimal'}`}>
                  {moveDifference > 0 ? `+${moveDifference}` : moveDifference}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Violations:</span>
                <span className="stat-value violation">{violationCount}</span>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button 
              className="undo-btn"
              onClick={handleUndo}
              disabled={state.currentMoveCount === 0}
            >
              ↶ Undo (1 step)
            </button>
            <button className="reset-btn" onClick={handleReset}>
              🔄 Reset
            </button>
          </div>

          <div className="solution-comparison">
            <h3>Optimal Solution Preview</h3>
            {optimalSolution ? (
              <div className="solution-info">
                <div className="solution-meta">
                  <span>Duration: {optimalSolution.durationMs}ms</span>
                  <span>Solver: {optimalSolution.solverName || 'Unknown'}</span>
                </div>
                <div className="solution-steps">
                  <div className="steps-preview">
                    {optimalSolution.steps.slice(0, 5).map((step, index) => (
                      <span key={index} className="step-item">
                        {step.action}
                      </span>
                    ))}
                    {optimalSolution.steps.length > 5 && (
                      <span className="steps-more">
                        +{optimalSolution.steps.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-solution">No optimal solution available</div>
            )}
          </div>

          <div className="optimization-tips">
            <h3>Optimization Tips</h3>
            <ul>
              <li>Plan your moves before executing</li>
              <li>Minimize unnecessary rotations</li>
              <li>Use hard drops efficiently</li>
              <li>Consider piece sequence optimization</li>
              <li>Listen for violation sounds and undo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};