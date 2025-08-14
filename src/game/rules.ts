import type { Board, Piece, Position, Cell } from './types';
import { BOARD_WIDTH, BOARD_HEIGHT, TOTAL_HEIGHT } from './types';

export function createBoard(): Board {
  return Array(TOTAL_HEIGHT).fill(null).map(() => 
    Array(BOARD_WIDTH).fill(0)
  );
}

export function isValidPosition(board: Board, piece: Piece, position: Position): boolean {
  const { matrix } = piece;
  
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (matrix[row][col]) {
        const newX = position.x + col;
        const newY = position.y + row;
        
        // Check boundaries
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= TOTAL_HEIGHT) {
          return false;
        }
        
        // Check collision with placed pieces (allow above board)
        if (newY >= 0 && board[newY][newX] !== 0) {
          return false;
        }
      }
    }
  }
  
  return true;
}

export function placePiece(board: Board, piece: Piece): Board {
  const newBoard = board.map(row => [...row]);
  const { matrix, position, type } = piece;
  
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (matrix[row][col]) {
        const y = position.y + row;
        const x = position.x + col;
        
        if (y >= 0 && y < TOTAL_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
          newBoard[y][x] = type;
        }
      }
    }
  }
  
  return newBoard;
}

export function clearLines(board: Board): { board: Board; linesCleared: number } {
  const newBoard: Board = [];
  let linesCleared = 0;
  
  // Check from bottom to top
  for (let row = TOTAL_HEIGHT - 1; row >= 0; row--) {
    const isFull = board[row].every(cell => cell !== 0);
    
    if (!isFull) {
      newBoard.unshift([...board[row]]);
    } else {
      linesCleared++;
    }
  }
  
  // Add empty rows at top
  while (newBoard.length < TOTAL_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(0));
  }
  
  return { board: newBoard, linesCleared };
}

export function getDropPosition(board: Board, piece: Piece): Position {
  let position = { ...piece.position };
  
  while (isValidPosition(board, piece, { x: position.x, y: position.y + 1 })) {
    position.y++;
  }
  
  return position;
}

export function isGameOver(board: Board): boolean {
  // Check if any blocks are in the buffer zone (above row 20)
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    if (board[row].some(cell => cell !== 0)) {
      return true;
    }
  }
  return false;
}

export interface LockDelayManager {
  reset(): void;
  update(deltaTime: number, onGround: boolean): boolean;
  triggerSoftDropLock(): void;
  canReset(): boolean;
  performReset(): void;
}

export class StandardLockDelayManager implements LockDelayManager {
  private timer: number = 0;
  private resets: number = 0;
  private softDropLockTriggered: boolean = false;
  private readonly maxResets: number = 15;
  private readonly lockDelay: number = 500; // 500ms
  
  reset(): void {
    this.timer = 0;
    this.resets = 0;
    this.softDropLockTriggered = false;
  }
  
  update(deltaTime: number, onGround: boolean): boolean {
    if (!onGround) {
      this.timer = 0;
      return false;
    }
    
    this.timer += deltaTime;
    
    // Instant lock on hard drop
    if (this.timer >= this.lockDelay || this.softDropLockTriggered) {
      return true;
    }
    
    return false;
  }
  
  triggerSoftDropLock(): void {
    this.softDropLockTriggered = true;
  }
  
  canReset(): boolean {
    return this.resets < this.maxResets;
  }
  
  performReset(): void {
    if (this.canReset()) {
      this.timer = 0;
      this.resets++;
      this.softDropLockTriggered = false;
    }
  }
}

export function getGhostPosition(board: Board, piece: Piece): Position {
  return getDropPosition(board, piece);
}

export function canPlacePiece(board: Board, piece: Piece): boolean {
  return isValidPosition(board, piece, piece.position);
}

export function getVisibleBoard(board: Board): Cell[][] {
  // Return only the visible portion (bottom 20 rows)
  return board.slice(BOARD_HEIGHT, TOTAL_HEIGHT);
}