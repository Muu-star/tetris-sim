import { PersistenceManager } from './persistence.manager';
import type { Problem, Solution, Replay, Result, QueryOptions, StorageStats } from './types';

/**
 * Global persistence manager instance
 * Initialize once at app startup
 */
let persistenceManager: PersistenceManager | null = null;

/**
 * Initialize the persistence layer
 * Call this once at app startup
 */
export async function initializePersistence(config?: {
  dbName?: string;
  dbVersion?: number;
  keyPrefix?: string;
  maxStorageBytes?: number;
}): Promise<Result<'indexeddb' | 'localstorage'>> {
  persistenceManager = new PersistenceManager(config);
  return persistenceManager.initialize();
}

/**
 * Get the persistence manager instance
 */
export function getPersistenceManager(): PersistenceManager {
  if (!persistenceManager) {
    throw new Error('Persistence not initialized. Call initializePersistence() first.');
  }
  return persistenceManager;
}

/**
 * Generate a unique ID for entities
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current ISO timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// ============================================================================
// PROBLEM USE CASES
// ============================================================================

/**
 * Create and save a new problem
 */
export async function createProblem(data: {
  title: string;
  tags: string[];
  fumen: string;
  description?: string;
  difficulty?: number;
  author?: string;
}): Promise<Result<Problem>> {
  const problem: Problem = {
    id: generateId(),
    title: data.title,
    tags: data.tags,
    fumen: data.fumen,
    createdAt: getCurrentTimestamp(),
    description: data.description,
    difficulty: data.difficulty,
    author: data.author,
  };

  return getPersistenceManager().saveProblem(problem);
}

/**
 * Save an existing problem
 */
export async function saveProblem(problem: Problem): Promise<Result<Problem>> {
  return getPersistenceManager().saveProblem(problem);
}

/**
 * Load a problem by ID
 */
export async function loadProblem(id: string): Promise<Result<Problem | null>> {
  return getPersistenceManager().loadProblem(id);
}

/**
 * Update a problem
 */
export async function updateProblem(id: string, updates: Partial<Omit<Problem, 'id' | 'createdAt'>>): Promise<Result<Problem>> {
  return getPersistenceManager().updateProblem(id, updates);
}

/**
 * Delete a problem and all its solutions
 */
export async function deleteProblem(id: string): Promise<Result<void>> {
  const manager = getPersistenceManager();
  
  // First delete all solutions for this problem
  const solutionsResult = await manager.findSolutionsByProblem(id);
  if (solutionsResult.success) {
    for (const solution of solutionsResult.data) {
      await manager.deleteSolution(solution.id);
    }
  }
  
  // Then delete the problem
  return manager.deleteProblem(id);
}

/**
 * List all problems with optional filtering and sorting
 */
export async function listProblems(options?: QueryOptions): Promise<Result<Problem[]>> {
  return getPersistenceManager().listProblems(options);
}

/**
 * Find problems by tags
 */
export async function findProblemsByTags(tags: string[], options?: QueryOptions): Promise<Result<Problem[]>> {
  return getPersistenceManager().findProblemsByTags(tags, options);
}

/**
 * Get problems by difficulty range
 */
export async function findProblemsByDifficulty(minDifficulty: number, maxDifficulty: number, options?: QueryOptions): Promise<Result<Problem[]>> {
  const allProblemsResult = await getPersistenceManager().listProblems();
  if (!allProblemsResult.success) return allProblemsResult;
  
  const filtered = allProblemsResult.data.filter(problem => 
    problem.difficulty !== undefined && 
    problem.difficulty >= minDifficulty && 
    problem.difficulty <= maxDifficulty
  );
  
  // Apply sorting and pagination
  if (options?.sortBy) {
    filtered.sort((a, b) => {
      const aVal = (a as any)[options.sortBy!];
      const bVal = (b as any)[options.sortBy!];
      let comp = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comp = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comp = aVal - bVal;
      }
      return options.sortOrder === 'desc' ? -comp : comp;
    });
  }
  
  const offset = options?.offset || 0;
  const limit = options?.limit || filtered.length;
  const paginated = filtered.slice(offset, offset + limit);
  
  return { success: true, data: paginated };
}

// ============================================================================
// SOLUTION USE CASES
// ============================================================================

/**
 * Create and save a solution
 */
export async function createSolution(data: {
  problemId: string;
  steps: Solution['steps'];
  durationMs: number;
  score?: number;
  solverName?: string;
}): Promise<Result<Solution>> {
  const solution: Solution = {
    id: generateId(),
    problemId: data.problemId,
    steps: data.steps,
    durationMs: data.durationMs,
    createdAt: getCurrentTimestamp(),
    score: data.score,
    solverName: data.solverName,
  };

  return getPersistenceManager().saveSolution(solution);
}

/**
 * Save an existing solution
 */
export async function saveSolution(solution: Solution): Promise<Result<Solution>> {
  return getPersistenceManager().saveSolution(solution);
}

/**
 * Load a solution by ID
 */
export async function loadSolution(id: string): Promise<Result<Solution | null>> {
  return getPersistenceManager().loadSolution(id);
}

/**
 * Update a solution
 */
export async function updateSolution(id: string, updates: Partial<Omit<Solution, 'id' | 'createdAt'>>): Promise<Result<Solution>> {
  return getPersistenceManager().updateSolution(id, updates);
}

/**
 * Delete a solution
 */
export async function deleteSolution(id: string): Promise<Result<void>> {
  return getPersistenceManager().deleteSolution(id);
}

/**
 * List all solutions with optional filtering and sorting
 */
export async function listSolutions(options?: QueryOptions): Promise<Result<Solution[]>> {
  return getPersistenceManager().listSolutions(options);
}

/**
 * Find solutions for a specific problem
 */
export async function findSolutionsByProblem(problemId: string, options?: QueryOptions): Promise<Result<Solution[]>> {
  return getPersistenceManager().findSolutionsByProblem(problemId, options);
}

/**
 * Get the best solution for a problem (by duration)
 */
export async function getBestSolution(problemId: string): Promise<Result<Solution | null>> {
  const solutionsResult = await getPersistenceManager().findSolutionsByProblem(problemId, {
    sortBy: 'durationMs',
    sortOrder: 'asc',
    limit: 1,
  });
  
  if (!solutionsResult.success) return solutionsResult;
  
  const bestSolution = solutionsResult.data[0] || null;
  return { success: true, data: bestSolution };
}

/**
 * Get solution statistics for a problem
 */
export async function getSolutionStats(problemId: string): Promise<Result<{
  totalSolutions: number;
  averageDuration: number;
  bestDuration: number;
  averageScore?: number;
  bestScore?: number;
}>> {
  const solutionsResult = await getPersistenceManager().findSolutionsByProblem(problemId);
  if (!solutionsResult.success) return solutionsResult;
  
  const solutions = solutionsResult.data;
  if (solutions.length === 0) {
    return {
      success: true,
      data: {
        totalSolutions: 0,
        averageDuration: 0,
        bestDuration: 0,
      },
    };
  }
  
  const totalDuration = solutions.reduce((sum, s) => sum + s.durationMs, 0);
  const averageDuration = totalDuration / solutions.length;
  const bestDuration = Math.min(...solutions.map(s => s.durationMs));
  
  const scoresWithValues = solutions.filter(s => s.score !== undefined);
  let averageScore: number | undefined;
  let bestScore: number | undefined;
  
  if (scoresWithValues.length > 0) {
    const totalScore = scoresWithValues.reduce((sum, s) => sum + s.score!, 0);
    averageScore = totalScore / scoresWithValues.length;
    bestScore = Math.max(...scoresWithValues.map(s => s.score!));
  }
  
  return {
    success: true,
    data: {
      totalSolutions: solutions.length,
      averageDuration,
      bestDuration,
      averageScore,
      bestScore,
    },
  };
}

// ============================================================================
// REPLAY USE CASES
// ============================================================================

/**
 * Create and save a replay
 */
export async function createReplay(data: {
  title: string;
  startIdx: number;
  endIdx: number;
  inputs: Replay['inputs'];
  version?: string;
  metadata?: Replay['metadata'];
}): Promise<Result<Replay>> {
  const replay: Replay = {
    id: generateId(),
    title: data.title,
    startIdx: data.startIdx,
    endIdx: data.endIdx,
    inputs: data.inputs,
    createdAt: getCurrentTimestamp(),
    version: data.version,
    metadata: data.metadata,
  };

  return getPersistenceManager().saveReplay(replay);
}

/**
 * Save an existing replay
 */
export async function saveReplay(replay: Replay): Promise<Result<Replay>> {
  return getPersistenceManager().saveReplay(replay);
}

/**
 * Load a replay by ID
 */
export async function loadReplay(id: string): Promise<Result<Replay | null>> {
  return getPersistenceManager().loadReplay(id);
}

/**
 * Update a replay
 */
export async function updateReplay(id: string, updates: Partial<Omit<Replay, 'id' | 'createdAt'>>): Promise<Result<Replay>> {
  return getPersistenceManager().updateReplay(id, updates);
}

/**
 * Delete a replay
 */
export async function deleteReplay(id: string): Promise<Result<void>> {
  return getPersistenceManager().deleteReplay(id);
}

/**
 * List all replays with optional filtering and sorting
 */
export async function listReplays(options?: QueryOptions): Promise<Result<Replay[]>> {
  return getPersistenceManager().listReplays(options);
}

// ============================================================================
// UTILITY USE CASES
// ============================================================================

/**
 * Clear all data
 */
export async function clearAllData(): Promise<Result<void>> {
  return getPersistenceManager().clear();
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<Result<StorageStats>> {
  return getPersistenceManager().getStats();
}

/**
 * Export all data as JSON
 */
export async function exportAllData(): Promise<Result<{
  problems: Problem[];
  solutions: Solution[];
  replays: Replay[];
}>> {
  return getPersistenceManager().exportData();
}

/**
 * Import data from JSON
 */
export async function importAllData(data: {
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
}>> {
  return getPersistenceManager().importData(data);
}

/**
 * Download data as JSON file
 */
export async function downloadDataAsFile(): Promise<Result<void>> {
  try {
    const exportResult = await exportAllData();
    if (!exportResult.success) return exportResult;
    
    const blob = new Blob([JSON.stringify(exportResult.data, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tetris-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: `Failed to download data: ${error}` };
  }
}

/**
 * Import data from file upload
 */
export async function importDataFromFile(file: File): Promise<Result<{
  imported: {
    problems: number;
    solutions: number;
    replays: number;
  };
  errors: string[];
}>> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    return importAllData(data);
  } catch (error) {
    return { success: false, error: `Failed to import data from file: ${error}` };
  }
}