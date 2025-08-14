export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type RotationState = 0 | 1 | 2 | 3;

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  type: PieceType;
  position: Position;
  rotation: RotationState;
  matrix: number[][];
}

export type Cell = 0 | PieceType;

export type Board = Cell[][];

export interface GameState {
  board: Board;
  currentPiece: Piece | null;
  heldPiece: PieceType | null;
  nextPieces: PieceType[];
  score: number;
  lines: number;
  level: number;
  isGameOver: boolean;
  canHold: boolean;
  lockDelay: number;
  softDropLockReset: boolean;
}

export interface InputState {
  left: boolean;
  right: boolean;
  down: boolean;
  hardDrop: boolean;
  rotateClockwise: boolean;
  rotateCounterclockwise: boolean;
  hold: boolean;
}

export interface InputTimings {
  das: number; // Delayed Auto Shift in frames (60fps)
  arr: number; // Auto Repeat Rate in frames
  softDropSpeed: number; // cells per second
}

export interface BagGenerator {
  next(): PieceType;
  peek(count: number): PieceType[];
  reset(): void;
}

export interface KickTable {
  [key: string]: Position[];
}

export interface SRSKickData {
  'I': KickTable;
  'O': KickTable;
  'T': KickTable;
  'S': KickTable;
  'Z': KickTable;
  'J': KickTable;
  'L': KickTable;
}

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const VISIBLE_HEIGHT = 20;
export const BUFFER_HEIGHT = 20;
export const TOTAL_HEIGHT = VISIBLE_HEIGHT + BUFFER_HEIGHT;

export const INPUT_TIMINGS: InputTimings = {
  das: 10, // 10 frames = ~167ms at 60fps
  arr: 2,  // 2 frames = ~33ms at 60fps
  softDropSpeed: 20 // 20 cells per second
};

export const LOCK_DELAY = 30; // 30 frames = 500ms at 60fps
export const MAX_LOCK_RESETS = 15;

export interface InputHandler {
  update(deltaTime: number): void;
  getState(): InputState;
  keyDown(key: string): void;
  keyUp(key: string): void;
  reset(): void;
}