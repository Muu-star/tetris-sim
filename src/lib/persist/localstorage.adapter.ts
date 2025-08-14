import type { IStorage, StorageConfig } from './storage.interface';
import type { Problem, Solution, Replay, Result, QueryOptions, StorageStats } from './types';

export class LocalStorageAdapter implements IStorage {
  private readonly keyPrefix: string;
  private readonly maxStorageBytes: number;

  constructor(config: StorageConfig = {}) {
    this.keyPrefix = config.keyPrefix || 'tetris-persist:';
    this.maxStorageBytes = config.maxStorageBytes || 5 * 1024 * 1024; // 5MB default
  }

  async initialize(): Promise<Result<void>> {
    try {
      // Test localStorage availability
      const testKey = `${this.keyPrefix}test`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Failed to initialize localStorage: ${error}` };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (typeof localStorage === 'undefined') return false;
      
      const testKey = 'test-storage';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private getKey(type: 'problems' | 'solutions' | 'replays', id: string): string {
    return `${this.keyPrefix}${type}:${id}`;
  }

  private getListKey(type: 'problems' | 'solutions' | 'replays'): string {
    return `${this.keyPrefix}${type}:list`;
  }

  private async getStorageSize(): Promise<number> {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.keyPrefix)) {
        const value = localStorage.getItem(key);
        total += (key.length + (value?.length || 0)) * 2; // Unicode chars are 2 bytes
      }
    }
    return total;
  }

  private async checkStorageQuota(additionalSize: number): Promise<boolean> {
    const currentSize = await this.getStorageSize();
    return currentSize + additionalSize <= this.maxStorageBytes;
  }

  private getItemList(type: 'problems' | 'solutions' | 'replays'): string[] {
    try {
      const listData = localStorage.getItem(this.getListKey(type));
      return listData ? JSON.parse(listData) : [];
    } catch {
      return [];
    }
  }

  private setItemList(type: 'problems' | 'solutions' | 'replays', ids: string[]): void {
    localStorage.setItem(this.getListKey(type), JSON.stringify(ids));
  }

  private addToList(type: 'problems' | 'solutions' | 'replays', id: string): void {
    const list = this.getItemList(type);
    if (!list.includes(id)) {
      list.push(id);
      this.setItemList(type, list);
    }
  }

  private removeFromList(type: 'problems' | 'solutions' | 'replays', id: string): void {
    const list = this.getItemList(type);
    const filtered = list.filter(item => item !== id);
    this.setItemList(type, filtered);
  }

  private async saveItem<T>(type: 'problems' | 'solutions' | 'replays', id: string, item: T): Promise<Result<T>> {
    try {
      const data = JSON.stringify(item);
      const key = this.getKey(type, id);
      
      // Check storage quota
      const additionalSize = (key.length + data.length) * 2;
      if (!(await this.checkStorageQuota(additionalSize))) {
        return { success: false, error: 'Storage quota exceeded' };
      }
      
      localStorage.setItem(key, data);
      this.addToList(type, id);
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: `Failed to save ${type.slice(0, -1)}: ${error}` };
    }
  }

  private loadItem<T>(type: 'problems' | 'solutions' | 'replays', id: string): Result<T | null> {
    try {
      const data = localStorage.getItem(this.getKey(type, id));
      if (!data) {
        return { success: true, data: null };
      }
      const item = JSON.parse(data) as T;
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: `Failed to load ${type.slice(0, -1)}: ${error}` };
    }
  }

  private async deleteItem(type: 'problems' | 'solutions' | 'replays', id: string): Promise<Result<void>> {
    try {
      localStorage.removeItem(this.getKey(type, id));
      this.removeFromList(type, id);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Failed to delete ${type.slice(0, -1)}: ${error}` };
    }
  }

  private async listItems<T>(
    type: 'problems' | 'solutions' | 'replays',
    options?: QueryOptions,
    filter?: (item: T) => boolean
  ): Promise<Result<T[]>> {
    try {
      const ids = this.getItemList(type);
      const items: T[] = [];
      
      for (const id of ids) {
        const result = this.loadItem<T>(type, id);
        if (result.success && result.data) {
          if (!filter || filter(result.data)) {
            items.push(result.data);
          }
        }
      }
      
      // Apply sorting
      if (options?.sortBy) {
        items.sort((a, b) => {
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
      
      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit || items.length;
      const paginated = items.slice(offset, offset + limit);
      
      return { success: true, data: paginated };
    } catch (error) {
      return { success: false, error: `Failed to list ${type}: ${error}` };
    }
  }

  // Problem operations
  async saveProblem(problem: Problem): Promise<Result<Problem>> {
    return this.saveItem('problems', problem.id, problem);
  }

  async loadProblem(id: string): Promise<Result<Problem | null>> {
    return this.loadItem<Problem>('problems', id);
  }

  async updateProblem(id: string, updates: Partial<Problem>): Promise<Result<Problem>> {
    const existingResult = this.loadItem<Problem>('problems', id);
    if (!existingResult.success) return existingResult;
    if (!existingResult.data) {
      return { success: false, error: 'Problem not found' };
    }
    
    const updated = { ...existingResult.data, ...updates, id };
    return this.saveItem('problems', id, updated);
  }

  async deleteProblem(id: string): Promise<Result<void>> {
    return this.deleteItem('problems', id);
  }

  async listProblems(options?: QueryOptions): Promise<Result<Problem[]>> {
    return this.listItems<Problem>('problems', options);
  }

  async findProblemsByTags(tags: string[], options?: QueryOptions): Promise<Result<Problem[]>> {
    return this.listItems<Problem>('problems', options, (problem) => {
      return tags.some(tag => problem.tags.includes(tag));
    });
  }

  // Solution operations
  async saveSolution(solution: Solution): Promise<Result<Solution>> {
    return this.saveItem('solutions', solution.id, solution);
  }

  async loadSolution(id: string): Promise<Result<Solution | null>> {
    return this.loadItem<Solution>('solutions', id);
  }

  async updateSolution(id: string, updates: Partial<Solution>): Promise<Result<Solution>> {
    const existingResult = this.loadItem<Solution>('solutions', id);
    if (!existingResult.success) return existingResult;
    if (!existingResult.data) {
      return { success: false, error: 'Solution not found' };
    }
    
    const updated = { ...existingResult.data, ...updates, id };
    return this.saveItem('solutions', id, updated);
  }

  async deleteSolution(id: string): Promise<Result<void>> {
    return this.deleteItem('solutions', id);
  }

  async listSolutions(options?: QueryOptions): Promise<Result<Solution[]>> {
    return this.listItems<Solution>('solutions', options);
  }

  async findSolutionsByProblem(problemId: string, options?: QueryOptions): Promise<Result<Solution[]>> {
    return this.listItems<Solution>('solutions', options, (solution) => {
      return solution.problemId === problemId;
    });
  }

  // Replay operations
  async saveReplay(replay: Replay): Promise<Result<Replay>> {
    return this.saveItem('replays', replay.id, replay);
  }

  async loadReplay(id: string): Promise<Result<Replay | null>> {
    return this.loadItem<Replay>('replays', id);
  }

  async updateReplay(id: string, updates: Partial<Replay>): Promise<Result<Replay>> {
    const existingResult = this.loadItem<Replay>('replays', id);
    if (!existingResult.success) return existingResult;
    if (!existingResult.data) {
      return { success: false, error: 'Replay not found' };
    }
    
    const updated = { ...existingResult.data, ...updates, id };
    return this.saveItem('replays', id, updated);
  }

  async deleteReplay(id: string): Promise<Result<void>> {
    return this.deleteItem('replays', id);
  }

  async listReplays(options?: QueryOptions): Promise<Result<Replay[]>> {
    return this.listItems<Replay>('replays', options);
  }

  // Utility operations
  async clear(): Promise<Result<void>> {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.keyPrefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Failed to clear localStorage: ${error}` };
    }
  }

  async getStats(): Promise<Result<StorageStats>> {
    try {
      const problemCount = this.getItemList('problems').length;
      const solutionCount = this.getItemList('solutions').length;
      const replayCount = this.getItemList('replays').length;
      const estimatedSizeBytes = await this.getStorageSize();
      
      return {
        success: true,
        data: {
          problemCount,
          solutionCount,
          replayCount,
          estimatedSizeBytes,
          storageBackend: 'localstorage',
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
      const problemsResult = await this.listItems<Problem>('problems');
      const solutionsResult = await this.listItems<Solution>('solutions');
      const replaysResult = await this.listItems<Replay>('replays');
      
      if (!problemsResult.success) return problemsResult;
      if (!solutionsResult.success) return solutionsResult;
      if (!replaysResult.success) return replaysResult;
      
      return {
        success: true,
        data: {
          problems: problemsResult.data,
          solutions: solutionsResult.data,
          replays: replaysResult.data,
        },
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
      const errors: string[] = [];
      const imported = { problems: 0, solutions: 0, replays: 0 };
      
      // Import problems
      if (data.problems) {
        for (const problem of data.problems) {
          const result = await this.saveProblem(problem);
          if (result.success) {
            imported.problems++;
          } else {
            errors.push(`Failed to import problem ${problem.id}: ${result.error}`);
          }
        }
      }
      
      // Import solutions
      if (data.solutions) {
        for (const solution of data.solutions) {
          const result = await this.saveSolution(solution);
          if (result.success) {
            imported.solutions++;
          } else {
            errors.push(`Failed to import solution ${solution.id}: ${result.error}`);
          }
        }
      }
      
      // Import replays
      if (data.replays) {
        for (const replay of data.replays) {
          const result = await this.saveReplay(replay);
          if (result.success) {
            imported.replays++;
          } else {
            errors.push(`Failed to import replay ${replay.id}: ${result.error}`);
          }
        }
      }
      
      return {
        success: true,
        data: { imported, errors },
      };
    } catch (error) {
      return { success: false, error: `Failed to import data: ${error}` };
    }
  }
}