/**
 * Persistence layer entry point
 * 
 * This module provides a complete persistence solution for Tetris problems, solutions, and replays
 * with IndexedDB as the primary storage and localStorage as a fallback.
 * 
 * All JSON keys are human-readable for LLM analysis.
 */

// Export types
export type {
  Problem,
  Solution,
  SolutionStep,
  Replay,
  InputFrame,
  ReplayMetadata,
  Result,
  QueryOptions,
  StorageStats,
} from './types';

export type {
  IStorage,
  StorageBackend,
  StorageConfig,
} from './storage.interface';

// Export storage adapters
export { IndexedDBAdapter } from './indexeddb.adapter';
export { LocalStorageAdapter } from './localstorage.adapter';

// Export persistence manager
export { PersistenceManager } from './persistence.manager';

// Export all use case functions
export {
  // Initialization
  initializePersistence,
  getPersistenceManager,
  generateId,
  getCurrentTimestamp,
  
  // Problem use cases
  createProblem,
  saveProblem,
  loadProblem,
  updateProblem,
  deleteProblem,
  listProblems,
  findProblemsByTags,
  findProblemsByDifficulty,
  
  // Solution use cases
  createSolution,
  saveSolution,
  loadSolution,
  updateSolution,
  deleteSolution,
  listSolutions,
  findSolutionsByProblem,
  getBestSolution,
  getSolutionStats,
  
  // Replay use cases
  createReplay,
  saveReplay,
  loadReplay,
  updateReplay,
  deleteReplay,
  listReplays,
  
  // Utility use cases
  clearAllData,
  getStorageStats,
  exportAllData,
  importAllData,
  downloadDataAsFile,
  importDataFromFile,
} from './use-cases';