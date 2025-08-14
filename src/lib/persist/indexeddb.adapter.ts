import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { IStorage, StorageConfig } from './storage.interface';
import type { Problem, Solution, Replay, Result, QueryOptions, StorageStats } from './types';

interface TetrisDBSchema extends DBSchema {
  problems: {
    key: string;
    value: Problem;
    indexes: {
      'by-created': string;
      'by-tags': string[];
      'by-difficulty': number;
    };
  };
  solutions: {
    key: string;
    value: Solution;
    indexes: {
      'by-problem': string;
      'by-created': string;
      'by-duration': number;
    };
  };
  replays: {
    key: string;
    value: Replay;
    indexes: {
      'by-created': string;
      'by-title': string;
    };
  };
}

export class IndexedDBAdapter implements IStorage {
  private db: IDBPDatabase<TetrisDBSchema> | null = null;
  private readonly dbName: string;
  private readonly dbVersion: number;

  constructor(config: StorageConfig = {}) {
    this.dbName = config.dbName || 'tetris-persist';
    this.dbVersion = config.dbVersion || 1;
  }

  async initialize(): Promise<Result<void>> {
    try {
      this.db = await openDB<TetrisDBSchema>(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Create problems store
          if (!db.objectStoreNames.contains('problems')) {
            const problemStore = db.createObjectStore('problems', { keyPath: 'id' });
            problemStore.createIndex('by-created', 'createdAt');
            problemStore.createIndex('by-tags', 'tags', { multiEntry: true });
            problemStore.createIndex('by-difficulty', 'difficulty');
          }

          // Create solutions store
          if (!db.objectStoreNames.contains('solutions')) {
            const solutionStore = db.createObjectStore('solutions', { keyPath: 'id' });
            solutionStore.createIndex('by-problem', 'problemId');
            solutionStore.createIndex('by-created', 'createdAt');
            solutionStore.createIndex('by-duration', 'durationMs');
          }

          // Create replays store
          if (!db.objectStoreNames.contains('replays')) {
            const replayStore = db.createObjectStore('replays', { keyPath: 'id' });
            replayStore.createIndex('by-created', 'createdAt');
            replayStore.createIndex('by-title', 'title');
          }
        },
      });
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Failed to initialize IndexedDB: ${error}` };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!('indexedDB' in window)) return false;
      
      // Test if we can actually open a database
      const testDb = await openDB('test-db', 1);
      await testDb.close();
      await new Promise((resolve, reject) => {
        const deleteReq = indexedDB.deleteDatabase('test-db');
        deleteReq.onsuccess = resolve;
        deleteReq.onerror = reject;
      });
      
      return true;
    } catch {
      return false;
    }
  }

  // Problem operations
  async saveProblem(problem: Problem): Promise<Result<Problem>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      await this.db.put('problems', problem);
      return { success: true, data: problem };
    } catch (error) {
      return { success: false, error: `Failed to save problem: ${error}` };
    }
  }

  async loadProblem(id: string): Promise<Result<Problem | null>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const problem = await this.db.get('problems', id);
      return { success: true, data: problem || null };
    } catch (error) {
      return { success: false, error: `Failed to load problem: ${error}` };
    }
  }

  async updateProblem(id: string, updates: Partial<Problem>): Promise<Result<Problem>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const existing = await this.db.get('problems', id);
      if (!existing) {
        return { success: false, error: 'Problem not found' };
      }
      
      const updated = { ...existing, ...updates, id };
      await this.db.put('problems', updated);
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: `Failed to update problem: ${error}` };
    }
  }

  async deleteProblem(id: string): Promise<Result<void>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      await this.db.delete('problems', id);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Failed to delete problem: ${error}` };
    }
  }

  async listProblems(options?: QueryOptions): Promise<Result<Problem[]>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const tx = this.db.transaction('problems', 'readonly');
      const store = tx.objectStore('problems');
      
      let cursor = await (options?.sortBy === 'createdAt' 
        ? store.index('by-created').openCursor(null, options?.sortOrder === 'desc' ? 'prev' : 'next')
        : store.openCursor());
      
      const problems: Problem[] = [];
      const offset = options?.offset || 0;
      const limit = options?.limit || Infinity;
      let count = 0;
      
      while (cursor) {
        if (count >= offset && problems.length < limit) {
          problems.push(cursor.value);
        }
        count++;
        if (problems.length >= limit) break;
        cursor = await cursor.continue();
      }
      
      return { success: true, data: problems };
    } catch (error) {
      return { success: false, error: `Failed to list problems: ${error}` };
    }
  }

  async findProblemsByTags(tags: string[], options?: QueryOptions): Promise<Result<Problem[]>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const tx = this.db.transaction('problems', 'readonly');
      const index = tx.objectStore('problems').index('by-tags');
      
      const problemMap = new Map<string, Problem>();
      
      for (const tag of tags) {
        let cursor = await index.openCursor(IDBKeyRange.only(tag));
        while (cursor) {
          problemMap.set(cursor.value.id, cursor.value);
          cursor = await cursor.continue();
        }
      }
      
      let problems = Array.from(problemMap.values());
      
      // Apply sorting
      if (options?.sortBy === 'createdAt') {
        problems.sort((a, b) => {
          const comp = a.createdAt.localeCompare(b.createdAt);
          return options.sortOrder === 'desc' ? -comp : comp;
        });
      }
      
      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit || problems.length;
      problems = problems.slice(offset, offset + limit);
      
      return { success: true, data: problems };
    } catch (error) {
      return { success: false, error: `Failed to find problems by tags: ${error}` };
    }
  }

  // Solution operations
  async saveSolution(solution: Solution): Promise<Result<Solution>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      await this.db.put('solutions', solution);
      return { success: true, data: solution };
    } catch (error) {
      return { success: false, error: `Failed to save solution: ${error}` };
    }
  }

  async loadSolution(id: string): Promise<Result<Solution | null>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const solution = await this.db.get('solutions', id);
      return { success: true, data: solution || null };
    } catch (error) {
      return { success: false, error: `Failed to load solution: ${error}` };
    }
  }

  async updateSolution(id: string, updates: Partial<Solution>): Promise<Result<Solution>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const existing = await this.db.get('solutions', id);
      if (!existing) {
        return { success: false, error: 'Solution not found' };
      }
      
      const updated = { ...existing, ...updates, id };
      await this.db.put('solutions', updated);
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: `Failed to update solution: ${error}` };
    }
  }

  async deleteSolution(id: string): Promise<Result<void>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      await this.db.delete('solutions', id);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Failed to delete solution: ${error}` };
    }
  }

  async listSolutions(options?: QueryOptions): Promise<Result<Solution[]>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const tx = this.db.transaction('solutions', 'readonly');
      const store = tx.objectStore('solutions');
      
      let cursor = await (options?.sortBy === 'createdAt' 
        ? store.index('by-created').openCursor(null, options?.sortOrder === 'desc' ? 'prev' : 'next')
        : options?.sortBy === 'durationMs'
        ? store.index('by-duration').openCursor(null, options?.sortOrder === 'desc' ? 'prev' : 'next')
        : store.openCursor());
      
      const solutions: Solution[] = [];
      const offset = options?.offset || 0;
      const limit = options?.limit || Infinity;
      let count = 0;
      
      while (cursor) {
        if (count >= offset && solutions.length < limit) {
          solutions.push(cursor.value);
        }
        count++;
        if (solutions.length >= limit) break;
        cursor = await cursor.continue();
      }
      
      return { success: true, data: solutions };
    } catch (error) {
      return { success: false, error: `Failed to list solutions: ${error}` };
    }
  }

  async findSolutionsByProblem(problemId: string, options?: QueryOptions): Promise<Result<Solution[]>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const tx = this.db.transaction('solutions', 'readonly');
      const index = tx.objectStore('solutions').index('by-problem');
      
      let cursor = await index.openCursor(problemId);
      const solutions: Solution[] = [];
      
      while (cursor) {
        solutions.push(cursor.value);
        cursor = await cursor.continue();
      }
      
      // Apply sorting
      if (options?.sortBy === 'durationMs') {
        solutions.sort((a, b) => {
          const comp = a.durationMs - b.durationMs;
          return options.sortOrder === 'desc' ? -comp : comp;
        });
      } else if (options?.sortBy === 'createdAt') {
        solutions.sort((a, b) => {
          const comp = a.createdAt.localeCompare(b.createdAt);
          return options.sortOrder === 'desc' ? -comp : comp;
        });
      }
      
      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit || solutions.length;
      const paginated = solutions.slice(offset, offset + limit);
      
      return { success: true, data: paginated };
    } catch (error) {
      return { success: false, error: `Failed to find solutions by problem: ${error}` };
    }
  }

  // Replay operations
  async saveReplay(replay: Replay): Promise<Result<Replay>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      await this.db.put('replays', replay);
      return { success: true, data: replay };
    } catch (error) {
      return { success: false, error: `Failed to save replay: ${error}` };
    }
  }

  async loadReplay(id: string): Promise<Result<Replay | null>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const replay = await this.db.get('replays', id);
      return { success: true, data: replay || null };
    } catch (error) {
      return { success: false, error: `Failed to load replay: ${error}` };
    }
  }

  async updateReplay(id: string, updates: Partial<Replay>): Promise<Result<Replay>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const existing = await this.db.get('replays', id);
      if (!existing) {
        return { success: false, error: 'Replay not found' };
      }
      
      const updated = { ...existing, ...updates, id };
      await this.db.put('replays', updated);
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: `Failed to update replay: ${error}` };
    }
  }

  async deleteReplay(id: string): Promise<Result<void>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      await this.db.delete('replays', id);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Failed to delete replay: ${error}` };
    }
  }

  async listReplays(options?: QueryOptions): Promise<Result<Replay[]>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const tx = this.db.transaction('replays', 'readonly');
      const store = tx.objectStore('replays');
      
      let cursor = await (options?.sortBy === 'createdAt' 
        ? store.index('by-created').openCursor(null, options?.sortOrder === 'desc' ? 'prev' : 'next')
        : options?.sortBy === 'title'
        ? store.index('by-title').openCursor(null, options?.sortOrder === 'desc' ? 'prev' : 'next')
        : store.openCursor());
      
      const replays: Replay[] = [];
      const offset = options?.offset || 0;
      const limit = options?.limit || Infinity;
      let count = 0;
      
      while (cursor) {
        if (count >= offset && replays.length < limit) {
          replays.push(cursor.value);
        }
        count++;
        if (replays.length >= limit) break;
        cursor = await cursor.continue();
      }
      
      return { success: true, data: replays };
    } catch (error) {
      return { success: false, error: `Failed to list replays: ${error}` };
    }
  }

  // Utility operations
  async clear(): Promise<Result<void>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const tx = this.db.transaction(['problems', 'solutions', 'replays'], 'readwrite');
      await Promise.all([
        tx.objectStore('problems').clear(),
        tx.objectStore('solutions').clear(),
        tx.objectStore('replays').clear(),
      ]);
      
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Failed to clear database: ${error}` };
    }
  }

  async getStats(): Promise<Result<StorageStats>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const tx = this.db.transaction(['problems', 'solutions', 'replays'], 'readonly');
      const [problemCount, solutionCount, replayCount] = await Promise.all([
        tx.objectStore('problems').count(),
        tx.objectStore('solutions').count(),
        tx.objectStore('replays').count(),
      ]);
      
      // Try to estimate storage size
      let estimatedSizeBytes: number | undefined;
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        estimatedSizeBytes = estimate.usage;
      }
      
      return {
        success: true,
        data: {
          problemCount,
          solutionCount,
          replayCount,
          estimatedSizeBytes,
          storageBackend: 'indexeddb',
        },
      };
    } catch (error) {
      return { success: false, error: `Failed to get stats: ${error}` };
    }
  }

  async exportData(): Promise<Result<{
    problems: Problem[];
    solutions: Solution[];
    replays: Replay[];
  }>> {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const tx = this.db.transaction(['problems', 'solutions', 'replays'], 'readonly');
      const [problems, solutions, replays] = await Promise.all([
        tx.objectStore('problems').getAll(),
        tx.objectStore('solutions').getAll(),
        tx.objectStore('replays').getAll(),
      ]);
      
      return {
        success: true,
        data: { problems, solutions, replays },
      };
    } catch (error) {
      return { success: false, error: `Failed to export data: ${error}` };
    }
  }

  async importData(data: {
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
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      
      const errors: string[] = [];
      const imported = { problems: 0, solutions: 0, replays: 0 };
      
      const tx = this.db.transaction(['problems', 'solutions', 'replays'], 'readwrite');
      
      // Import problems
      if (data.problems) {
        for (const problem of data.problems) {
          try {
            await tx.objectStore('problems').put(problem);
            imported.problems++;
          } catch (error) {
            errors.push(`Failed to import problem ${problem.id}: ${error}`);
          }
        }
      }
      
      // Import solutions
      if (data.solutions) {
        for (const solution of data.solutions) {
          try {
            await tx.objectStore('solutions').put(solution);
            imported.solutions++;
          } catch (error) {
            errors.push(`Failed to import solution ${solution.id}: ${error}`);
          }
        }
      }
      
      // Import replays
      if (data.replays) {
        for (const replay of data.replays) {
          try {
            await tx.objectStore('replays').put(replay);
            imported.replays++;
          } catch (error) {
            errors.push(`Failed to import replay ${replay.id}: ${error}`);
          }
        }
      }
      
      await tx.done;
      
      return {
        success: true,
        data: { imported, errors },
      };
    } catch (error) {
      return { success: false, error: `Failed to import data: ${error}` };
    }
  }
}