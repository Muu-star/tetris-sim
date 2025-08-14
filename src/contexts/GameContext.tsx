import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { initializePersistence } from '../lib/persist';
import { createBoard, isValidPosition, placePiece, clearLines, getDropPosition } from '../game/rules';
import { createPiece, rotatePiece } from '../game/srs';
import { createBagGenerator } from '../game/bag';
import { createInputHandler } from '../game/input';
import type { Board, Piece, PieceType, GameState, BagGenerator, InputHandler } from '../game/types';

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
  | { type: 'HOLD_PIECE' }
  | { type: 'PLACE_PIECE_AT'; payload: { x: number; y: number; piece: Piece } }
  | { type: 'SET_BOARD'; payload: Board }
  | { type: 'RECORD_MOVE'; payload: GameMove }
  | { type: 'CLEAR_MOVES' }
  | { type: 'UNDO_MOVE' };

const initialBoard = createBoard();

const initialState: GameContextState = {
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
  },
  inputHandler: createInputHandler(),
  bag: createBagGenerator(),
  isPlaying: false,
  isPersistenceReady: false,
  currentMoveCount: 0,
  recordedMoves: [],
};

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
        const dropPosition = getDropPosition(state.gameState.board, piece);
        const droppedPiece = { ...piece, position: dropPosition };
        const newBoard = placePiece(state.gameState.board, droppedPiece);
        const { board: clearedBoard, linesCleared } = clearLines(newBoard);
        
        // Spawn next piece
        const nextPieceType = state.bag.next();
        const nextPiece = createPiece(nextPieceType);
        
        return {
          ...state,
          gameState: {
            ...state.gameState,
            board: clearedBoard,
            currentPiece: nextPiece,
            nextPieces: state.bag.peek(5),
            lines: state.gameState.lines + linesCleared,
            score: state.gameState.score + (linesCleared * 100),
          },
          currentMoveCount: state.currentMoveCount + 1,
        };
      } else {
        // Soft drop
        const newY = piece.position.y + 1;
        const newPosition = { x: piece.position.x, y: newY };
        
        if (isValidPosition(state.gameState.board, piece, newPosition)) {
          return {
            ...state,
            gameState: {
              ...state.gameState,
              currentPiece: { ...piece, position: newPosition },
            },
          };
        }
      }
      return state;
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
  const [state, dispatch] = useReducer(gameReducer, initialState);

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