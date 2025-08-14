import type { IStorage, StorageConfig, StorageBackend } from './storage.interface';
import { IndexedDBAdapter } from './indexeddb.adapter';
import { LocalStorageAdapter } from './localstorage.adapter';
import type { Result } from './types';

export class PersistenceManager {
  private storage: IStorage | null = null;
  private activeBackend: StorageBackend | null = null;
  private config: StorageConfig;

  constructor(config: StorageConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize the persistence manager with the best available storage backend
   */
  async initialize(): Promise<Result<StorageBackend>> {
    try {
      // Try IndexedDB first
      const indexedDBAdapter = new IndexedDBAdapter(this.config);
      if (await indexedDBAdapter.isAvailable()) {
        const initResult = await indexedDBAdapter.initialize();
        if (initResult.success) {
          this.storage = indexedDBAdapter;
          this.activeBackend = 'indexeddb';
          return { success: true, data: 'indexeddb' };
        }
      }

      // Fallback to localStorage
      const localStorageAdapter = new LocalStorageAdapter(this.config);
      if (await localStorageAdapter.isAvailable()) {
        const initResult = await localStorageAdapter.initialize();
        if (initResult.success) {
          this.storage = localStorageAdapter;
          this.activeBackend = 'localstorage';
          return { success: true, data: 'localstorage' };
        }
      }

      return { success: false, error: 'No storage backend available' };
    } catch (error) {
      return { success: false, error: `Failed to initialize persistence: ${error}` };
    }
  }

  /**
   * Get the current storage backend
   */
  getActiveBackend(): StorageBackend | null {
    return this.activeBackend;
  }

  /**
   * Get the current storage instance
   */
  getStorage(): IStorage | null {
    return this.storage;
  }

  /**
   * Switch to a specific storage backend
   */
  async switchBackend(backend: StorageBackend): Promise<Result<void>> {
    try {
      let newStorage: IStorage;

      switch (backend) {
        case 'indexeddb':
          newStorage = new IndexedDBAdapter(this.config);
          break;
        case 'localstorage':
          newStorage = new LocalStorageAdapter(this.config);
          break;
        default:
          return { success: false, error: `Unknown backend: ${backend}` };
      }

      if (!(await newStorage.isAvailable())) {
        return { success: false, error: `Backend ${backend} is not available` };
      }

      const initResult = await newStorage.initialize();
      if (!initResult.success) {
        return initResult;
      }

      this.storage = newStorage;
      this.activeBackend = backend;
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Failed to switch backend: ${error}` };
    }
  }

  /**
   * Migrate data from one backend to another
   */
  async migrateData(fromBackend: StorageBackend, toBackend: StorageBackend): Promise<Result<{
    migrated: {
      problems: number;
      solutions: number;
      replays: number;
    };
    errors: string[];
  }>> {
    try {
      // Initialize source backend
      let sourceStorage: IStorage;
      switch (fromBackend) {
        case 'indexeddb':
          sourceStorage = new IndexedDBAdapter(this.config);
          break;
        case 'localstorage':
          sourceStorage = new LocalStorageAdapter(this.config);
          break;
        default:
          return { success: false, error: `Unknown source backend: ${fromBackend}` };
      }

      if (!(await sourceStorage.isAvailable())) {
        return { success: false, error: `Source backend ${fromBackend} is not available` };
      }

      const sourceInitResult = await sourceStorage.initialize();
      if (!sourceInitResult.success) {
        return { success: false, error: `Failed to initialize source: ${sourceInitResult.error}` };
      }

      // Initialize destination backend
      let destStorage: IStorage;
      switch (toBackend) {
        case 'indexeddb':
          destStorage = new IndexedDBAdapter(this.config);
          break;
        case 'localstorage':
          destStorage = new LocalStorageAdapter(this.config);
          break;
        default:
          return { success: false, error: `Unknown destination backend: ${toBackend}` };
      }

      if (!(await destStorage.isAvailable())) {
        return { success: false, error: `Destination backend ${toBackend} is not available` };
      }

      const destInitResult = await destStorage.initialize();
      if (!destInitResult.success) {
        return { success: false, error: `Failed to initialize destination: ${destInitResult.error}` };
      }

      // Export data from source
      const exportResult = await sourceStorage.exportData();
      if (!exportResult.success) {
        return { success: false, error: `Failed to export data: ${exportResult.error}` };
      }

      // Import data to destination
      const importResult = await destStorage.importData(exportResult.data);
      if (!importResult.success) {
        return { success: false, error: `Failed to import data: ${importResult.error}` };
      }

      return { success: true, data: { migrated: importResult.data.imported, errors: importResult.data.errors } };
    } catch (error) {
      return { success: false, error: `Migration failed: ${error}` };
    }
  }

  /**
   * Check if persistence is ready to use
   */
  isReady(): boolean {
    return this.storage !== null && this.activeBackend !== null;
  }

  /**
   * Ensure the persistence manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.isReady()) {
      throw new Error('Persistence manager not initialized. Call initialize() first.');
    }
  }

  // Proxy methods to storage interface
  async saveProblem(...args: Parameters<IStorage['saveProblem']>) {
    this.ensureInitialized();
    return this.storage!.saveProblem(...args);
  }

  async loadProblem(...args: Parameters<IStorage['loadProblem']>) {
    this.ensureInitialized();
    return this.storage!.loadProblem(...args);
  }

  async updateProblem(...args: Parameters<IStorage['updateProblem']>) {
    this.ensureInitialized();
    return this.storage!.updateProblem(...args);
  }

  async deleteProblem(...args: Parameters<IStorage['deleteProblem']>) {
    this.ensureInitialized();
    return this.storage!.deleteProblem(...args);
  }

  async listProblems(...args: Parameters<IStorage['listProblems']>) {
    this.ensureInitialized();
    return this.storage!.listProblems(...args);
  }

  async findProblemsByTags(...args: Parameters<IStorage['findProblemsByTags']>) {
    this.ensureInitialized();
    return this.storage!.findProblemsByTags(...args);
  }

  async saveSolution(...args: Parameters<IStorage['saveSolution']>) {
    this.ensureInitialized();
    return this.storage!.saveSolution(...args);
  }

  async loadSolution(...args: Parameters<IStorage['loadSolution']>) {
    this.ensureInitialized();
    return this.storage!.loadSolution(...args);
  }

  async updateSolution(...args: Parameters<IStorage['updateSolution']>) {
    this.ensureInitialized();
    return this.storage!.updateSolution(...args);
  }

  async deleteSolution(...args: Parameters<IStorage['deleteSolution']>) {
    this.ensureInitialized();
    return this.storage!.deleteSolution(...args);
  }

  async listSolutions(...args: Parameters<IStorage['listSolutions']>) {
    this.ensureInitialized();
    return this.storage!.listSolutions(...args);
  }

  async findSolutionsByProblem(...args: Parameters<IStorage['findSolutionsByProblem']>) {
    this.ensureInitialized();
    return this.storage!.findSolutionsByProblem(...args);
  }

  async saveReplay(...args: Parameters<IStorage['saveReplay']>) {
    this.ensureInitialized();
    return this.storage!.saveReplay(...args);
  }

  async loadReplay(...args: Parameters<IStorage['loadReplay']>) {
    this.ensureInitialized();
    return this.storage!.loadReplay(...args);
  }

  async updateReplay(...args: Parameters<IStorage['updateReplay']>) {
    this.ensureInitialized();
    return this.storage!.updateReplay(...args);
  }

  async deleteReplay(...args: Parameters<IStorage['deleteReplay']>) {
    this.ensureInitialized();
    return this.storage!.deleteReplay(...args);
  }

  async listReplays(...args: Parameters<IStorage['listReplays']>) {
    this.ensureInitialized();
    return this.storage!.listReplays(...args);
  }

  async clear(...args: Parameters<IStorage['clear']>) {
    this.ensureInitialized();
    return this.storage!.clear(...args);
  }

  async getStats(...args: Parameters<IStorage['getStats']>) {
    this.ensureInitialized();
    return this.storage!.getStats(...args);
  }

  async exportData(...args: Parameters<IStorage['exportData']>) {
    this.ensureInitialized();
    return this.storage!.exportData(...args);
  }

  async importData(...args: Parameters<IStorage['importData']>) {
    this.ensureInitialized();
    return this.storage!.importData(...args);
  }
}