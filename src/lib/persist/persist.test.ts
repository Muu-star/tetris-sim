import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from './localstorage.adapter';
import type { Problem, Solution, Replay } from './types';
import { generateId, getCurrentTimestamp } from './use-cases';

describe('Persistence Layer', () => {
  let storage: LocalStorageAdapter;

  beforeEach(async () => {
    // Clear localStorage before each test
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('test-tetris:')) {
        localStorage.removeItem(key);
      }
    });
    
    // Initialize storage adapter
    storage = new LocalStorageAdapter({ keyPrefix: 'test-tetris:' });
    await storage.initialize();
  });

  describe('Utility functions', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    it('should generate valid ISO timestamps', () => {
      const timestamp = getCurrentTimestamp();
      
      expect(timestamp).toBeTruthy();
      expect(typeof timestamp).toBe('string');
      expect(() => new Date(timestamp)).not.toThrow();
      
      const date = new Date(timestamp);
      expect(date.toISOString()).toBe(timestamp);
    });
  });

  describe('Problem operations', () => {
    it('should save and load a problem', async () => {
      const problem: Problem = {
        id: generateId(),
        title: 'Test T-Spin Problem',
        tags: ['T-spin', 'beginner'],
        fumen: 'v115@9gF8DeF8DeF8DeF8BeglRpBehlRpAei0RpBtglRp?BtF8JeAgH',
        createdAt: getCurrentTimestamp(),
        description: 'Practice basic T-spin setups',
        difficulty: 3,
        author: 'TestUser',
      };

      const saveResult = await storage.saveProblem(problem);
      expect(saveResult.success).toBe(true);
      expect(saveResult.data.title).toBe('Test T-Spin Problem');

      const loadResult = await storage.loadProblem(problem.id);
      expect(loadResult.success).toBe(true);
      expect(loadResult.data?.title).toBe('Test T-Spin Problem');
      expect(loadResult.data?.id).toBe(problem.id);
    });

    it('should return null for non-existent problem', async () => {
      const result = await storage.loadProblem('non-existent-id');
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should list problems', async () => {
      const problem1: Problem = {
        id: generateId(),
        title: 'Problem 1',
        tags: ['tag1'],
        fumen: 'fumen1',
        createdAt: getCurrentTimestamp(),
      };

      const problem2: Problem = {
        id: generateId(),
        title: 'Problem 2',
        tags: ['tag2'],
        fumen: 'fumen2',
        createdAt: getCurrentTimestamp(),
      };

      await storage.saveProblem(problem1);
      await storage.saveProblem(problem2);

      const result = await storage.listProblems();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data.map(p => p.title)).toContain('Problem 1');
      expect(result.data.map(p => p.title)).toContain('Problem 2');
    });

    it('should find problems by tags', async () => {
      const problem1: Problem = {
        id: generateId(),
        title: 'T-Spin Problem',
        tags: ['T-spin', 'beginner'],
        fumen: 'fumen1',
        createdAt: getCurrentTimestamp(),
      };

      const problem2: Problem = {
        id: generateId(),
        title: 'Line Clear Problem',
        tags: ['line-clear', 'beginner'],
        fumen: 'fumen2',
        createdAt: getCurrentTimestamp(),
      };

      await storage.saveProblem(problem1);
      await storage.saveProblem(problem2);

      const result = await storage.findProblemsByTags(['T-spin']);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('T-Spin Problem');
    });
  });

  describe('Solution operations', () => {
    let problemId: string;

    beforeEach(async () => {
      const problem: Problem = {
        id: generateId(),
        title: 'Test Problem for Solutions',
        tags: ['test'],
        fumen: 'test-fumen',
        createdAt: getCurrentTimestamp(),
      };
      
      await storage.saveProblem(problem);
      problemId = problem.id;
    });

    it('should save and load a solution', async () => {
      const solution: Solution = {
        id: generateId(),
        problemId,
        steps: [
          { action: 'move_left', timestamp: 100, pieceType: 'T' },
          { action: 'rotate_cw', timestamp: 200, pieceType: 'T' },
          { action: 'hard_drop', timestamp: 300, pieceType: 'T' },
        ],
        durationMs: 5000,
        createdAt: getCurrentTimestamp(),
        score: 100,
        solverName: 'TestSolver',
      };

      const saveResult = await storage.saveSolution(solution);
      expect(saveResult.success).toBe(true);
      expect(saveResult.data.problemId).toBe(problemId);

      const loadResult = await storage.loadSolution(solution.id);
      expect(loadResult.success).toBe(true);
      expect(loadResult.data?.problemId).toBe(problemId);
      expect(loadResult.data?.steps).toHaveLength(3);
    });

    it('should find solutions by problem', async () => {
      const solution1: Solution = {
        id: generateId(),
        problemId,
        steps: [{ action: 'hard_drop', timestamp: 100 }],
        durationMs: 3000,
        createdAt: getCurrentTimestamp(),
      };

      const solution2: Solution = {
        id: generateId(),
        problemId,
        steps: [{ action: 'hard_drop', timestamp: 100 }],
        durationMs: 4000,
        createdAt: getCurrentTimestamp(),
      };

      await storage.saveSolution(solution1);
      await storage.saveSolution(solution2);

      const result = await storage.findSolutionsByProblem(problemId);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data.every(s => s.problemId === problemId)).toBe(true);
    });
  });

  describe('Replay operations', () => {
    it('should save and load a replay', async () => {
      const replay: Replay = {
        id: generateId(),
        title: 'Test Replay',
        startIdx: 0,
        endIdx: 100,
        inputs: [
          {
            frame: 0,
            buttons: { left: true },
            gameState: { score: 0, level: 1, lines: 0 },
          },
          {
            frame: 10,
            buttons: { rotateClockwise: true },
            gameState: { score: 40, level: 1, lines: 0 },
          },
        ],
        createdAt: getCurrentTimestamp(),
        version: '1.0',
        metadata: {
          gameMode: 'sprint',
          finalScore: 1000,
          totalLines: 10,
        },
      };

      const saveResult = await storage.saveReplay(replay);
      expect(saveResult.success).toBe(true);
      expect(saveResult.data.title).toBe('Test Replay');

      const loadResult = await storage.loadReplay(replay.id);
      expect(loadResult.success).toBe(true);
      expect(loadResult.data?.title).toBe('Test Replay');
      expect(loadResult.data?.inputs).toHaveLength(2);
    });

    it('should list replays', async () => {
      const replay: Replay = {
        id: generateId(),
        title: 'Replay 1',
        startIdx: 0,
        endIdx: 50,
        inputs: [],
        createdAt: getCurrentTimestamp(),
      };

      await storage.saveReplay(replay);

      const result = await storage.listReplays();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Replay 1');
    });
  });

  describe('Data management', () => {
    it('should get storage stats', async () => {
      const problem: Problem = {
        id: generateId(),
        title: 'Stats Test Problem',
        tags: ['stats'],
        fumen: 'stats-fumen',
        createdAt: getCurrentTimestamp(),
      };

      await storage.saveProblem(problem);

      const result = await storage.getStats();
      expect(result.success).toBe(true);
      expect(result.data.problemCount).toBe(1);
      expect(result.data.solutionCount).toBe(0);
      expect(result.data.replayCount).toBe(0);
      expect(result.data.storageBackend).toBe('localstorage');
    });

    it('should export and import data', async () => {
      // Create test data
      const problem: Problem = {
        id: generateId(),
        title: 'Export Test Problem',
        tags: ['export'],
        fumen: 'export-fumen',
        createdAt: getCurrentTimestamp(),
      };

      const solution: Solution = {
        id: generateId(),
        problemId: problem.id,
        steps: [{ action: 'hard_drop', timestamp: 100 }],
        durationMs: 2000,
        createdAt: getCurrentTimestamp(),
      };

      const replay: Replay = {
        id: generateId(),
        title: 'Export Test Replay',
        startIdx: 0,
        endIdx: 10,
        inputs: [],
        createdAt: getCurrentTimestamp(),
      };

      await storage.saveProblem(problem);
      await storage.saveSolution(solution);
      await storage.saveReplay(replay);

      // Export data
      const exportResult = await storage.exportData();
      expect(exportResult.success).toBe(true);
      expect(exportResult.data.problems).toHaveLength(1);
      expect(exportResult.data.solutions).toHaveLength(1);
      expect(exportResult.data.replays).toHaveLength(1);

      // Clear and import
      await storage.clear();
      const statsAfterClear = await storage.getStats();
      expect(statsAfterClear.data.problemCount).toBe(0);

      const importResult = await storage.importData(exportResult.data);
      expect(importResult.success).toBe(true);
      expect(importResult.data.imported.problems).toBe(1);
      expect(importResult.data.imported.solutions).toBe(1);
      expect(importResult.data.imported.replays).toBe(1);
      expect(importResult.data.errors).toHaveLength(0);

      // Verify data restored
      const statsAfterImport = await storage.getStats();
      expect(statsAfterImport.data.problemCount).toBe(1);
      expect(statsAfterImport.data.solutionCount).toBe(1);
      expect(statsAfterImport.data.replayCount).toBe(1);
    });

    it('should clear all data', async () => {
      // Create some test data
      const problem: Problem = {
        id: generateId(),
        title: 'Clear Test Problem',
        tags: ['clear'],
        fumen: 'clear-fumen',
        createdAt: getCurrentTimestamp(),
      };

      await storage.saveProblem(problem);

      // Verify data exists
      const statsBefore = await storage.getStats();
      expect(statsBefore.data.problemCount).toBe(1);

      // Clear data
      const clearResult = await storage.clear();
      expect(clearResult.success).toBe(true);

      // Verify data cleared
      const statsAfter = await storage.getStats();
      expect(statsAfter.data.problemCount).toBe(0);
      expect(statsAfter.data.solutionCount).toBe(0);
      expect(statsAfter.data.replayCount).toBe(0);
    });
  });
});