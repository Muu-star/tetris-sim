import type { Problem, Solution, Replay, Result, QueryOptions, StorageStats } from './types';

/**
 * Abstract storage interface that can be implemented by different backends
 */
export interface IStorage {
  /**
   * Initialize the storage backend
   */
  initialize(): Promise<Result<void>>;

  /**
   * Check if the storage backend is available
   */
  isAvailable(): Promise<boolean>;

  // Problem operations
  saveProblem(problem: Problem): Promise<Result<Problem>>;
  loadProblem(id: string): Promise<Result<Problem | null>>;
  updateProblem(id: string, updates: Partial<Problem>): Promise<Result<Problem>>;
  deleteProblem(id: string): Promise<Result<void>>;
  listProblems(options?: QueryOptions): Promise<Result<Problem[]>>;
  findProblemsByTags(tags: string[], options?: QueryOptions): Promise<Result<Problem[]>>;

  // Solution operations
  saveSolution(solution: Solution): Promise<Result<Solution>>;
  loadSolution(id: string): Promise<Result<Solution | null>>;
  updateSolution(id: string, updates: Partial<Solution>): Promise<Result<Solution>>;
  deleteSolution(id: string): Promise<Result<void>>;
  listSolutions(options?: QueryOptions): Promise<Result<Solution[]>>;
  findSolutionsByProblem(problemId: string, options?: QueryOptions): Promise<Result<Solution[]>>;

  // Replay operations
  saveReplay(replay: Replay): Promise<Result<Replay>>;
  loadReplay(id: string): Promise<Result<Replay | null>>;
  updateReplay(id: string, updates: Partial<Replay>): Promise<Result<Replay>>;
  deleteReplay(id: string): Promise<Result<void>>;
  listReplays(options?: QueryOptions): Promise<Result<Replay[]>>;

  // Utility operations
  clear(): Promise<Result<void>>;
  getStats(): Promise<Result<StorageStats>>;
  exportData(): Promise<Result<{
    problems: Problem[];
    solutions: Solution[];
    replays: Replay[];
  }>>;
  importData(data: {
    problems?: Problem[];
    solutions?: Solution[];
    replays?: Replay[];
  }): Promise<Result<{
    imported: {
      problems: number;
      solutions: number;
      replays: number;
    };
    errors: string[];
  }>>;
}

/**
 * Storage backend type identifier
 */
export type StorageBackend = 'indexeddb' | 'localstorage';

/**
 * Configuration options for storage backends
 */
export interface StorageConfig {
  /** Database name for IndexedDB */
  dbName?: string;
  /** Database version for IndexedDB */
  dbVersion?: number;
  /** Key prefix for localStorage */
  keyPrefix?: string;
  /** Maximum storage size in bytes (for quota management) */
  maxStorageBytes?: number;
}