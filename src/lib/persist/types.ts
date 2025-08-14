/**
 * Persistence layer types with human-readable field names for LLM analysis
 */

export interface Problem {
  /** Unique identifier for the problem */
  id: string;
  /** Human-readable title of the problem */
  title: string;
  /** Tags for categorization (e.g., "T-spin", "4-wide", "opener") */
  tags: string[];
  /** Fumen string representing the initial board state */
  fumen: string;
  /** ISO 8601 timestamp when the problem was created */
  createdAt: string;
  /** Optional description or instructions */
  description?: string;
  /** Optional difficulty level (1-10) */
  difficulty?: number;
  /** Optional author information */
  author?: string;
}

export interface Solution {
  /** Unique identifier for the solution */
  id: string;
  /** Reference to the problem this solution solves */
  problemId: string;
  /** Sequence of moves/steps taken to solve the problem */
  steps: SolutionStep[];
  /** Total time taken to complete the solution in milliseconds */
  durationMs: number;
  /** ISO 8601 timestamp when the solution was created */
  createdAt: string;
  /** Optional score achieved */
  score?: number;
  /** Optional player/solver name */
  solverName?: string;
}

export interface SolutionStep {
  /** Type of action performed */
  action: 'move_left' | 'move_right' | 'rotate_cw' | 'rotate_ccw' | 'soft_drop' | 'hard_drop' | 'hold';
  /** Timestamp relative to solution start (ms) */
  timestamp: number;
  /** Optional resulting board state after this step */
  boardState?: string;
  /** Optional piece type being manipulated */
  pieceType?: 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
}

export interface Replay {
  /** Unique identifier for the replay */
  id: string;
  /** Human-readable title for the replay */
  title: string;
  /** Starting frame index */
  startIdx: number;
  /** Ending frame index */
  endIdx: number;
  /** Array of input frames */
  inputs: InputFrame[];
  /** ISO 8601 timestamp when the replay was created */
  createdAt: string;
  /** Optional replay format version for compatibility */
  version?: string;
  /** Optional metadata like game mode, rules, etc. */
  metadata?: ReplayMetadata;
}

export interface InputFrame {
  /** Frame number (0-based) */
  frame: number;
  /** Buttons pressed in this frame */
  buttons: {
    left?: boolean;
    right?: boolean;
    down?: boolean;
    rotateClockwise?: boolean;
    rotateCounterclockwise?: boolean;
    hardDrop?: boolean;
    hold?: boolean;
  };
  /** Optional game state at this frame */
  gameState?: {
    score?: number;
    level?: number;
    lines?: number;
    pieceType?: string;
  };
}

export interface ReplayMetadata {
  /** Game mode (e.g., "marathon", "sprint", "ultra") */
  gameMode?: string;
  /** Rule set used (e.g., "guideline", "classic") */
  ruleSet?: string;
  /** Final score achieved */
  finalScore?: number;
  /** Total lines cleared */
  totalLines?: number;
  /** Maximum level reached */
  maxLevel?: number;
  /** Total duration in milliseconds */
  totalDurationMs?: number;
}

/**
 * Generic result type for async operations
 */
export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Query options for listing/filtering entities
 */
export interface QueryOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip (for pagination) */
  offset?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Filter criteria */
  filter?: Record<string, any>;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  /** Number of problems stored */
  problemCount: number;
  /** Number of solutions stored */
  solutionCount: number;
  /** Number of replays stored */
  replayCount: number;
  /** Estimated storage size in bytes */
  estimatedSizeBytes?: number;
  /** Storage backend being used */
  storageBackend: 'indexeddb' | 'localstorage';
}