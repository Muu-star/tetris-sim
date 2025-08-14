import React, { useState, useCallback, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { BoardRenderer } from '../game/renderer/Board';
import { listProblems, findProblemsByDifficulty, updateProblem } from '../lib/persist';
import type { Problem } from '../lib/persist/types';

type DifficultyLevel = 'Easy' | 'Normal' | 'Hard';

const DIFFICULTY_WEIGHTS = {
  Hard: 0.8,    // 80%
  Normal: 0.15, // 15%
  Easy: 0.05,   // 5%
};

export const DrillPage: React.FC = () => {
  const { state, actions } = useGame();
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    problemsSolved: 0,
    averageTime: 0,
    currentStreak: 0,
  });

  const selectNextProblem = useCallback(async () => {
    try {
      // Weighted random selection based on difficulty
      const random = Math.random();
      let targetDifficulty: number;
      
      if (random < DIFFICULTY_WEIGHTS.Hard) {
        targetDifficulty = 7; // Hard difficulty range: 7-10
      } else if (random < DIFFICULTY_WEIGHTS.Hard + DIFFICULTY_WEIGHTS.Normal) {
        targetDifficulty = 4; // Normal difficulty range: 4-6
      } else {
        targetDifficulty = 1; // Easy difficulty range: 1-3
      }

      // Find problems in the target difficulty range
      const difficultyRange = {
        min: targetDifficulty,
        max: targetDifficulty + 3,
      };

      const problemsResult = await findProblemsByDifficulty(
        difficultyRange.min,
        difficultyRange.max,
        { limit: 10 }
      );

      if (problemsResult.success && problemsResult.data.length > 0) {
        // Select random problem from the filtered list
        const randomIndex = Math.floor(Math.random() * problemsResult.data.length);
        const selectedProblem = problemsResult.data[randomIndex];
        setCurrentProblem(selectedProblem);
        
        // TODO: Load the problem's board state
        actions.resetGame();
        setIsCompleted(false);
      } else {
        // Fallback: get any problem
        const allProblemsResult = await listProblems({ limit: 10 });
        if (allProblemsResult.success && allProblemsResult.data.length > 0) {
          const randomIndex = Math.floor(Math.random() * allProblemsResult.data.length);
          setCurrentProblem(allProblemsResult.data[randomIndex]);
          actions.resetGame();
          setIsCompleted(false);
        }
      }
    } catch (error) {
      console.error('Failed to select next problem:', error);
    }
  }, [actions]);

  const handleProblemCompleted = useCallback(() => {
    setIsCompleted(true);
    setSessionStats(prev => ({
      ...prev,
      problemsSolved: prev.problemsSolved + 1,
      currentStreak: prev.currentStreak + 1,
    }));
  }, []);

  const handleDifficultyReclassification = useCallback(async (newDifficulty: DifficultyLevel) => {
    if (!currentProblem) return;

    try {
      const difficultyMapping = {
        'Easy': 2,
        'Normal': 5,
        'Hard': 8,
      };

      await updateProblem(currentProblem.id, {
        difficulty: difficultyMapping[newDifficulty],
      });

      console.log(`Problem reclassified as ${newDifficulty}`);
      
      // Move to next problem
      selectNextProblem();
    } catch (error) {
      console.error('Failed to update problem difficulty:', error);
    }
  }, [currentProblem, selectNextProblem]);

  const handleStartDrill = useCallback(() => {
    if (currentProblem) {
      actions.startGame();
    }
  }, [currentProblem, actions]);

  useEffect(() => {
    // Load initial problem when component mounts
    if (!currentProblem) {
      selectNextProblem();
    }
  }, [currentProblem, selectNextProblem]);

  return (
    <div className="drill-page">
      <div className="drill-header">
        <h2>🎯 Drill Practice</h2>
        <div className="session-stats">
          <div className="stat-item">
            <span>Problems Solved:</span>
            <span>{sessionStats.problemsSolved}</span>
          </div>
          <div className="stat-item">
            <span>Current Streak:</span>
            <span>{sessionStats.currentStreak}</span>
          </div>
        </div>
      </div>

      <div className="drill-content">
        <div className="board-section">
          <BoardRenderer
            board={state.gameState.board}
            currentPiece={state.gameState.currentPiece}
            nextPieces={state.gameState.nextPieces}
            heldPiece={state.gameState.heldPiece}
            showGhost={true}
          />
        </div>

        <div className="drill-controls">
          <div className="current-problem">
            <h3>Current Problem</h3>
            {currentProblem ? (
              <div className="problem-info">
                <div className="problem-title">{currentProblem.title}</div>
                <div className="problem-meta">
                  <span className="difficulty">
                    Difficulty: {currentProblem.difficulty || 'Unknown'}
                  </span>
                  <div className="problem-tags">
                    {currentProblem.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
                {currentProblem.description && (
                  <div className="problem-description">{currentProblem.description}</div>
                )}
              </div>
            ) : (
              <div className="no-problem">No problem loaded</div>
            )}
          </div>

          <div className="action-buttons">
            {!state.isPlaying && !isCompleted && (
              <button className="start-btn" onClick={handleStartDrill}>
                🎯 Start Drill
              </button>
            )}
            
            {state.isPlaying && (
              <button className="complete-btn" onClick={handleProblemCompleted}>
                ✅ Mark Complete
              </button>
            )}

            <button className="skip-btn" onClick={selectNextProblem}>
              ⏭️ Skip Problem
            </button>
          </div>

          {isCompleted && (
            <div className="completion-panel">
              <h3>Problem Completed! 🎉</h3>
              <div className="difficulty-feedback">
                <p>How was this problem?</p>
                <div className="difficulty-buttons">
                  <button 
                    className="difficulty-btn easy"
                    onClick={() => handleDifficultyReclassification('Easy')}
                  >
                    😊 Too Easy
                  </button>
                  <button 
                    className="difficulty-btn normal"
                    onClick={() => handleDifficultyReclassification('Normal')}
                  >
                    😐 Just Right
                  </button>
                  <button 
                    className="difficulty-btn hard"
                    onClick={() => handleDifficultyReclassification('Hard')}
                  >
                    😅 Too Hard
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="drill-algorithm">
            <h3>Selection Algorithm</h3>
            <div className="algorithm-weights">
              <div className="weight-item">
                <span>Hard Problems:</span>
                <span>80%</span>
              </div>
              <div className="weight-item">
                <span>Normal Problems:</span>
                <span>15%</span>
              </div>
              <div className="weight-item">
                <span>Easy Problems:</span>
                <span>5%</span>
              </div>
            </div>
            <p className="algorithm-note">
              New problems are registered as "Hard" by default.
              Your feedback helps improve the algorithm.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};