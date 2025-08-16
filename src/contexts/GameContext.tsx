import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import { initializePersistence } from '../lib/persist';
import { createBoard, isValidPosition, placePiece, clearLines, getDropPosition } from '../game/rules';
import { createPiece, rotatePiece } from '../game/srs';
import { createBagGenerator } from '../game/bag';
import { createInputHandler } from '../game/input';
import { createGamepadHandler } from '../game/gamepad';
import { useKeyConfig } from './KeyConfigContext';
import type { Board, Piece, PieceType, GameState, BagGenerator, InputHandler } from '../game/types';
import type { GamepadHandler } from '../game/gamepad';

interface GameContextState {
  gameState: GameState;
  inputHandler: InputHandler;
  bag: BagGenerator;
  isPlaying: boolean;
  isPersistenceReady: boolean;
  currentMoveCount: number;
  recordedMoves: GameMove[];
}

interface GameMove {
  action: 'move_left' | 'move_right' | 'rotate_cw' | 'rotate_ccw' | 'soft_drop' | 'hard_drop' | 'hold';
  timestamp: number;
  boardState?: string;
  pieceType?: PieceType;
}

type GameAction = 
  | { type: 'INITIALIZE_PERSISTENCE'; payload: boolean }
  | { type: 'START_GAME' }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESET_GAME'; payload?: { board?: Board; nextPieces?: PieceType[] } }
  | { type: 'UPDATE_GAME'; payload: { deltaTime: number } }
  | { type: 'MOVE_PIECE'; payload: { direction: 'left' | 'right' } }
  | { type: 'ROTATE_PIECE'; payload: { clockwise: boolean } }
  | { type: 'DROP_PIECE'; payload: { hard?: boolean } }
  | { type: 'SOFT_DROP_RELEASE' }
  | { type: 'HOLD_PIECE' }
  | { type: 'PLACE_PIECE_AT'; payload: { x: number; y: number; piece: Piece } }
  | { type: 'SET_BOARD'; payload: Board }
  | { type: 'RECORD_MOVE'; payload: GameMove }
  | { type: 'CLEAR_MOVES' }
  | { type: 'UNDO_MOVE' };

const initialBoard = createBoard();

const createInitialState = (): GameContextState => ({
  gameState: {
    board: initialBoard,
    currentPiece: null,
    heldPiece: null,
    nextPieces: [],
    score: 0,
    lines: 0,
    level: 1,
    isGameOver: false,
    canHold: true,
    lockDelay: 0,
    softDropLockReset: false,
    wasSoftDropping: false,
    isSoftDropping: false,
  },
  inputHandler: createInputHandler(),
  bag: createBagGenerator(),
  isPlaying: false,
  isPersistenceReady: false,
  currentMoveCount: 0,
  recordedMoves: [],
});

function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case 'INITIALIZE_PERSISTENCE':
      return { ...state, isPersistenceReady: action.payload };

    case 'START_GAME':
      if (!state.gameState.currentPiece) {
        const nextPiece = state.bag.next();
        const piece = createPiece(nextPiece);
        return {
          ...state,
          isPlaying: true,
          gameState: {
            ...state.gameState,
            currentPiece: piece,
            nextPieces: state.bag.peek(5),
          },
        };
      }
      return { ...state, isPlaying: true };

    case 'PAUSE_GAME':
      return { ...state, isPlaying: false };

    case 'RESET_GAME': {
      const newBoard = action.payload?.board || createBoard();
      const newBag = createBagGenerator();
      const nextPieces = action.payload?.nextPieces || newBag.peek(5);
      
      return {
        ...state,
        gameState: {
          board: newBoard,
          currentPiece: null,
          heldPiece: null,
          nextPieces,
          score: 0,
          lines: 0,
          level: 1,
          isGameOver: false,
          canHold: true,
          lockDelay: 0,
          softDropLockReset: false,
          wasSoftDropping: false,
          isSoftDropping: false,
        },
        bag: newBag,
        isPlaying: false,
        currentMoveCount: 0,
        recordedMoves: [],
      };
    }

    case 'MOVE_PIECE': {
      if (!state.gameState.currentPiece || !state.isPlaying) return state;
      
      const { direction } = action.payload;
      const piece = state.gameState.currentPiece;
      const newX = piece.position.x + (direction === 'left' ? -1 : 1);
      const newPosition = { x: newX, y: piece.position.y };
      
      if (isValidPosition(state.gameState.board, piece, newPosition)) {
        return {
          ...state,
          gameState: {
            ...state.gameState,
            currentPiece: { ...piece, position: newPosition },
          },
          currentMoveCount: state.currentMoveCount + 1,
        };
      }
      return state;
    }

    case 'ROTATE_PIECE': {
      if (!state.gameState.currentPiece || !state.isPlaying) return state;
      
      const piece = state.gameState.currentPiece;
      const rotatedPiece = rotatePiece(piece, action.payload.clockwise);
      
      if (isValidPosition(state.gameState.board, rotatedPiece, rotatedPiece.position)) {
        return {
          ...state,
          gameState: {
            ...state.gameState,
            currentPiece: rotatedPiece,
          },
          currentMoveCount: state.currentMoveCount + 1,
        };
      }
      return state;
    }

    case 'DROP_PIECE': {
      if (!state.gameState.currentPiece || !state.isPlaying) return state;
      
      const piece = state.gameState.currentPiece;
      const { hard } = action.payload;
      
      if (hard) {
        // Hard drop - move to lowest position and lock immediately
        const dropPosition = getDropPosition(state.gameState.board, piece);
        const droppedPiece = { ...piece, position: dropPosition };
        const newBoard = placePiece(state.gameState.board, droppedPiece);
        const { board: clearedBoard, linesCleared } = clearLines(newBoard);
        
        // Spawn next piece
        const nextPieceType = state.bag.next();
        const nextPiece = createPiece(nextPieceType);
        
        // Check for game over
        const isGameOver = !isValidPosition(clearedBoard, nextPiece, nextPiece.position);
        
        return {
          ...state,
          gameState: {
            ...state.gameState,
            board: clearedBoard,
            currentPiece: isGameOver ? null : nextPiece,
            nextPieces: state.bag.peek(5),
            lines: state.gameState.lines + linesCleared,
            score: state.gameState.score + (linesCleared * 100) + 2, // +2 for hard drop
            canHold: true,
            lockDelay: 0,
            isGameOver,
            wasSoftDropping: false,
            isSoftDropping: false,
          },
          currentMoveCount: state.currentMoveCount + 1,
        };
      } else {
        // Soft drop - move down at 20 cells/sec while holding
        const newY = piece.position.y + 1;
        const newPosition = { x: piece.position.x, y: newY };
        
        if (isValidPosition(state.gameState.board, piece, newPosition)) {
          // Can move down
          return {
            ...state,
            gameState: {
              ...state.gameState,
              currentPiece: { ...piece, position: newPosition },
              lockDelay: 0,
              isSoftDropping: true,
              wasSoftDropping: state.gameState.isSoftDropping,
            },
          };
        } else {
          // Can't move down - check if we should lock
          // Lock if: was soft dropping, released, and pressed again
          if (state.gameState.wasSoftDropping && !state.gameState.isSoftDropping) {
            // This is a re-press after release while grounded - lock the piece
            const newBoard = placePiece(state.gameState.board, piece);
            const { board: clearedBoard, linesCleared } = clearLines(newBoard);
            
            // Spawn next piece
            const nextPieceType = state.bag.next();
            const nextPiece = createPiece(nextPieceType);
            
            // Check for game over
            const isGameOver = !isValidPosition(clearedBoard, nextPiece, nextPiece.position);
            
            return {
              ...state,
              gameState: {
                ...state.gameState,
                board: clearedBoard,
                currentPiece: isGameOver ? null : nextPiece,
                nextPieces: state.bag.peek(5),
                lines: state.gameState.lines + linesCleared,
                score: state.gameState.score + (linesCleared * 100) + 1, // +1 for soft drop
                canHold: true,
                lockDelay: 0,
                isGameOver,
                wasSoftDropping: false,
                isSoftDropping: false,
              },
              currentMoveCount: state.currentMoveCount + 1,
            };
          } else {
            // Just mark that we're soft dropping while grounded
            return {
              ...state,
              gameState: {
                ...state.gameState,
                isSoftDropping: true,
                wasSoftDropping: state.gameState.isSoftDropping,
                lockDelay: 500, // Start lock delay timer when grounded
              },
            };
          }
        }
      }
    }

    case 'SOFT_DROP_RELEASE': {
      // Mark that soft drop was released
      return {
        ...state,
        gameState: {
          ...state.gameState,
          wasSoftDropping: state.gameState.isSoftDropping,
          isSoftDropping: false,
        },
      };
    }

    case 'HOLD_PIECE': {
      if (!state.gameState.currentPiece || !state.gameState.canHold || !state.isPlaying) {
        return state;
      }
      
      const currentPieceType = state.gameState.currentPiece.type;
      let newCurrentPiece: Piece;
      
      if (state.gameState.heldPiece) {
        newCurrentPiece = createPiece(state.gameState.heldPiece);
      } else {
        const nextPieceType = state.bag.next();
        newCurrentPiece = createPiece(nextPieceType);
      }
      
      return {
        ...state,
        gameState: {
          ...state.gameState,
          currentPiece: newCurrentPiece,
          heldPiece: currentPieceType,
          canHold: false,
          nextPieces: state.bag.peek(5),
        },
        currentMoveCount: state.currentMoveCount + 1,
      };
    }

    case 'PLACE_PIECE_AT': {
      const { x, y, piece } = action.payload;
      const newPosition = { x, y };
      
      if (isValidPosition(state.gameState.board, piece, newPosition)) {
        const newBoard = placePiece(state.gameState.board, { ...piece, position: newPosition });
        return {
          ...state,
          gameState: {
            ...state.gameState,
            board: newBoard,
          },
        };
      }
      return state;
    }

    case 'SET_BOARD':
      return {
        ...state,
        gameState: {
          ...state.gameState,
          board: action.payload,
        },
      };

    case 'RECORD_MOVE':
      return {
        ...state,
        recordedMoves: [...state.recordedMoves, action.payload],
      };

    case 'CLEAR_MOVES':
      return {
        ...state,
        recordedMoves: [],
        currentMoveCount: 0,
      };

    case 'UNDO_MOVE': {
      if (state.recordedMoves.length === 0) return state;
      
      const newMoves = state.recordedMoves.slice(0, -1);
      return {
        ...state,
        recordedMoves: newMoves,
        currentMoveCount: Math.max(0, state.currentMoveCount - 1),
      };
    }

    case 'UPDATE_GAME': {
      // Gravity is set to 0 - pieces don't fall automatically
      // Only handle lock delay when piece is at the bottom and can't move down
      if (!state.gameState.currentPiece || !state.isPlaying || state.gameState.isGameOver) {
        return state;
      }

      const { deltaTime } = action.payload;
      const piece = state.gameState.currentPiece;
      
      // Check if piece is grounded (can't move down)
      const testPosition = { x: piece.position.x, y: piece.position.y + 1 };
      const isGrounded = !isValidPosition(state.gameState.board, piece, testPosition);
      
      if (isGrounded && state.gameState.lockDelay > 0) {
        // Piece is grounded and has lock delay active
        const newLockDelay = state.gameState.lockDelay + deltaTime;
        
        // If lock delay exceeded, place the piece
        if (newLockDelay >= 500) { // 500ms lock delay
          const newBoard = placePiece(state.gameState.board, piece);
          const { board: clearedBoard, linesCleared } = clearLines(newBoard);
          
          // Spawn next piece
          const nextPieceType = state.bag.next();
          const nextPiece = createPiece(nextPieceType);
          
          // Check for game over
          const isGameOver = !isValidPosition(clearedBoard, nextPiece, nextPiece.position);
          
          return {
            ...state,
            gameState: {
              ...state.gameState,
              board: clearedBoard,
              currentPiece: isGameOver ? null : nextPiece,
              nextPieces: state.bag.peek(5),
              lines: state.gameState.lines + linesCleared,
              score: state.gameState.score + (linesCleared * 100),
              canHold: true,
              lockDelay: 0,
              isGameOver,
            },
          };
        } else {
          // Update lock delay
          return {
            ...state,
            gameState: {
              ...state.gameState,
              lockDelay: newLockDelay,
            },
          };
        }
      }
      
      return state;
    }

    default:
      return state;
  }
}

interface GameContextValue {
  state: GameContextState;
  dispatch: React.Dispatch<GameAction>;
  actions: {
    startGame: () => void;
    pauseGame: () => void;
    resetGame: (options?: { board?: Board; nextPieces?: PieceType[] }) => void;
    movePiece: (direction: 'left' | 'right') => void;
    rotatePiece: (clockwise: boolean) => void;
    dropPiece: (hard?: boolean) => void;
    holdPiece: () => void;
    placePieceAt: (x: number, y: number, piece: Piece) => void;
    setBoard: (board: Board) => void;
    recordMove: (move: GameMove) => void;
    clearMoves: () => void;
    undoMove: () => void;
  };
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const keyConfigContext = useKeyConfig();
  const config = keyConfigContext?.config;
  const [state, dispatch] = useReducer(gameReducer, createInitialState());
  const gamepadHandlerRef = useRef<GamepadHandler | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const prevSoftDropStateRef = useRef<boolean>(false);

  useEffect(() => {
    const initPersistence = async () => {
      try {
        const result = await initializePersistence();
        dispatch({ type: 'INITIALIZE_PERSISTENCE', payload: result.success });
      } catch (error) {
        console.error('Failed to initialize persistence:', error);
        dispatch({ type: 'INITIALIZE_PERSISTENCE', payload: false });
      }
    };

    initPersistence();
  }, []);

  // Initialize gamepad handler and update with config
  useEffect(() => {
    gamepadHandlerRef.current = createGamepadHandler();
    if (gamepadHandlerRef.current && config) {
      gamepadHandlerRef.current.updateButtonMapping(config.gamepad);
      gamepadHandlerRef.current.updateTimings(config.das, config.arr);
    }
    
    return () => {
      gamepadHandlerRef.current = null;
    };
  }, [config]);
  
  // Update input handler with keyboard config
  useEffect(() => {
    if (state.inputHandler && config && 'updateKeyMapping' in state.inputHandler) {
      (state.inputHandler as any).updateKeyMapping(config.keyboard);
    }
  }, [state.inputHandler, config]);

  // Setup keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.isPlaying) return;
      
      // Prevent default for game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key)) {
        e.preventDefault();
      }
      
      state.inputHandler.keyDown(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!state.isPlaying) return;
      state.inputHandler.keyUp(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [state.isPlaying, state.inputHandler]);

  // Game loop with input processing
  useEffect(() => {
    if (!state.isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const gameLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = currentTime;

      // Update input handler with delta time
      state.inputHandler.update(deltaTime);
      
      // Process gamepad input separately
      if (gamepadHandlerRef.current) {
        // Update gamepad state with DAS/ARR timing
        gamepadHandlerRef.current.update(deltaTime);
        
        const presses = gamepadHandlerRef.current.getButtonPresses();
        const releases = gamepadHandlerRef.current.getButtonReleases();
        
        // Handle soft drop release
        if (releases.has('softDrop')) {
          dispatch({ type: 'SOFT_DROP_RELEASE' });
        }
        
        // Handle gamepad button presses directly (don't route through keyboard handler)
        for (const action of presses) {
          switch (action) {
            case 'left':
              dispatch({ type: 'MOVE_PIECE', payload: { direction: 'left' } });
              break;
            case 'right':
              dispatch({ type: 'MOVE_PIECE', payload: { direction: 'right' } });
              break;
            case 'softDrop':
              dispatch({ type: 'DROP_PIECE', payload: { hard: false } });
              break;
            case 'hardDrop':
              dispatch({ type: 'DROP_PIECE', payload: { hard: true } });
              break;
            case 'rotateClockwise':
              dispatch({ type: 'ROTATE_PIECE', payload: { clockwise: true } });
              break;
            case 'rotateCounterclockwise':
              dispatch({ type: 'ROTATE_PIECE', payload: { clockwise: false } });
              break;
            case 'hold':
              dispatch({ type: 'HOLD_PIECE' });
              break;
            case 'undo':
              dispatch({ type: 'UNDO_MOVE' });
              break;
            case 'reset':
              dispatch({ type: 'RESET_GAME' });
              break;
          }
        }
      }
      
      // Process keyboard input (can work alongside gamepad)
      const inputState = state.inputHandler.getState();
      
      // Check if soft drop was released
      if (prevSoftDropStateRef.current && !inputState.down) {
        dispatch({ type: 'SOFT_DROP_RELEASE' });
      }
      prevSoftDropStateRef.current = inputState.down;
      
      if (inputState.left) {
        dispatch({ type: 'MOVE_PIECE', payload: { direction: 'left' } });
      }
      if (inputState.right) {
        dispatch({ type: 'MOVE_PIECE', payload: { direction: 'right' } });
      }
      if (inputState.down) {
        dispatch({ type: 'DROP_PIECE', payload: { hard: false } });
      }
      if (inputState.hardDrop) {
        dispatch({ type: 'DROP_PIECE', payload: { hard: true } });
      }
      if (inputState.rotateClockwise) {
        dispatch({ type: 'ROTATE_PIECE', payload: { clockwise: true } });
      }
      if (inputState.rotateCounterclockwise) {
        dispatch({ type: 'ROTATE_PIECE', payload: { clockwise: false } });
      }
      if (inputState.hold) {
        dispatch({ type: 'HOLD_PIECE' });
      }
      
      // Update game state
      dispatch({ type: 'UPDATE_GAME', payload: { deltaTime } });
      
      // Continue game loop
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    // Start game loop
    lastUpdateTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [state.isPlaying, state.inputHandler]);

  const actions = {
    startGame: useCallback(() => {
      dispatch({ type: 'START_GAME' });
    }, []),

    pauseGame: useCallback(() => {
      dispatch({ type: 'PAUSE_GAME' });
    }, []),

    resetGame: useCallback((options?: { board?: Board; nextPieces?: PieceType[] }) => {
      dispatch({ type: 'RESET_GAME', payload: options });
    }, []),

    movePiece: useCallback((direction: 'left' | 'right') => {
      dispatch({ type: 'MOVE_PIECE', payload: { direction } });
    }, []),

    rotatePiece: useCallback((clockwise: boolean) => {
      dispatch({ type: 'ROTATE_PIECE', payload: { clockwise } });
    }, []),

    dropPiece: useCallback((hard?: boolean) => {
      dispatch({ type: 'DROP_PIECE', payload: { hard } });
    }, []),

    holdPiece: useCallback(() => {
      dispatch({ type: 'HOLD_PIECE' });
    }, []),

    placePieceAt: useCallback((x: number, y: number, piece: Piece) => {
      dispatch({ type: 'PLACE_PIECE_AT', payload: { x, y, piece } });
    }, []),

    setBoard: useCallback((board: Board) => {
      dispatch({ type: 'SET_BOARD', payload: board });
    }, []),

    recordMove: useCallback((move: GameMove) => {
      dispatch({ type: 'RECORD_MOVE', payload: move });
    }, []),

    clearMoves: useCallback(() => {
      dispatch({ type: 'CLEAR_MOVES' });
    }, []),

    undoMove: useCallback(() => {
      dispatch({ type: 'UNDO_MOVE' });
    }, []),
  };

  const value: GameContextValue = {
    state,
    dispatch,
    actions,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextValue => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export type { GameMove };