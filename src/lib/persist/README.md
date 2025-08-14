# Tetris Persistence Layer

A robust persistence layer for Tetris problems, solutions, and replays with human-readable JSON keys for LLM analysis.

## Features

- **Dual Storage Backend**: IndexedDB (primary) with localStorage fallback
- **Type-Safe**: Full TypeScript support with well-defined interfaces
- **Human-Readable Keys**: All JSON keys are descriptive for LLM analysis
- **Use Cases**: High-level functions for common operations
- **Data Migration**: Import/export functionality with error handling
- **Storage Management**: Quota monitoring and statistics

## Quick Start

```typescript
import { 
  initializePersistence, 
  createProblem, 
  saveSolution, 
  listProblems 
} from '@/lib/persist';

// Initialize (call once at app startup)
const initResult = await initializePersistence();
if (!initResult.success) {
  console.error('Failed to initialize persistence:', initResult.error);
}

// Create a problem
const problem = await createProblem({
  title: 'T-Spin Triple Setup',
  tags: ['T-spin', 'intermediate'],
  fumen: 'v115@9gF8DeF8DeF8DeF8BeglRpBehlRpAei0RpBtglRp?BtF8JeAgH',
  description: 'Learn basic T-spin triple mechanics',
  difficulty: 5
});

// Create a solution
const solution = await createSolution({
  problemId: problem.data.id,
  steps: [
    { action: 'move_left', timestamp: 100, pieceType: 'T' },
    { action: 'rotate_cw', timestamp: 200, pieceType: 'T' },
    { action: 'hard_drop', timestamp: 300, pieceType: 'T' }
  ],
  durationMs: 5000,
  score: 400
});

// List problems
const problems = await listProblems({
  sortBy: 'createdAt',
  sortOrder: 'desc',
  limit: 10
});
```

## Data Models

### Problem
Represents a Tetris puzzle or practice scenario:

```typescript
interface Problem {
  id: string;                    // Unique identifier
  title: string;                 // Human-readable title
  tags: string[];                // Categorization tags
  fumen: string;                 // Board state representation
  createdAt: string;             // ISO 8601 timestamp
  description?: string;          // Optional instructions
  difficulty?: number;           // 1-10 scale
  author?: string;               // Creator name
}
```

### Solution
Represents a sequence of moves solving a problem:

```typescript
interface Solution {
  id: string;                    // Unique identifier
  problemId: string;             // Reference to problem
  steps: SolutionStep[];         // Move sequence
  durationMs: number;            // Completion time
  createdAt: string;             // ISO 8601 timestamp
  score?: number;                // Optional score
  solverName?: string;           // Player name
}

interface SolutionStep {
  action: 'move_left' | 'move_right' | 'rotate_cw' | 'rotate_ccw' | 
          'soft_drop' | 'hard_drop' | 'hold';
  timestamp: number;             // Relative to solution start
  boardState?: string;           // Optional resulting state
  pieceType?: PieceType;         // Piece being manipulated
}
```

### Replay
Represents a recorded gameplay session:

```typescript
interface Replay {
  id: string;                    // Unique identifier
  title: string;                 // Session description
  startIdx: number;              // Starting frame
  endIdx: number;                // Ending frame
  inputs: InputFrame[];          // Frame-by-frame inputs
  createdAt: string;             // ISO 8601 timestamp
  version?: string;              // Format version
  metadata?: ReplayMetadata;     // Game context
}
```

## API Reference

### Initialization
```typescript
// Initialize with default settings
await initializePersistence();

// Initialize with custom configuration
await initializePersistence({
  dbName: 'my-tetris-db',
  dbVersion: 2,
  keyPrefix: 'tetris-app:',
  maxStorageBytes: 10 * 1024 * 1024 // 10MB
});
```

### Problem Operations
```typescript
// Create
const problem = await createProblem({
  title: 'My Problem',
  tags: ['practice'],
  fumen: 'fumen-string'
});

// Load
const problem = await loadProblem('problem-id');

// Update
await updateProblem('problem-id', { 
  difficulty: 7,
  tags: ['advanced', 'T-spin'] 
});

// List with filtering
const problems = await listProblems({
  sortBy: 'difficulty',
  sortOrder: 'asc',
  limit: 5
});

// Find by tags
const tspinProblems = await findProblemsByTags(['T-spin']);

// Find by difficulty range
const beginnerProblems = await findProblemsByDifficulty(1, 3);

// Delete (also deletes associated solutions)
await deleteProblem('problem-id');
```

### Solution Operations
```typescript
// Create
const solution = await createSolution({
  problemId: 'problem-id',
  steps: [
    { action: 'move_left', timestamp: 100 },
    { action: 'hard_drop', timestamp: 200 }
  ],
  durationMs: 3000
});

// Find solutions for a problem
const solutions = await findSolutionsByProblem('problem-id', {
  sortBy: 'durationMs',
  sortOrder: 'asc'
});

// Get best solution (fastest)
const best = await getBestSolution('problem-id');

// Get statistics
const stats = await getSolutionStats('problem-id');
// Returns: { totalSolutions, averageDuration, bestDuration, etc. }
```

### Replay Operations
```typescript
// Create
const replay = await createReplay({
  title: 'My Game Session',
  startIdx: 0,
  endIdx: 1000,
  inputs: [
    { frame: 0, buttons: { left: true } },
    { frame: 10, buttons: { rotateClockwise: true } }
  ],
  metadata: {
    gameMode: 'sprint',
    finalScore: 5000
  }
});

// List replays
const replays = await listReplays({
  sortBy: 'createdAt',
  sortOrder: 'desc'
});
```

### Data Management
```typescript
// Get storage statistics
const stats = await getStorageStats();
console.log(`${stats.data.problemCount} problems stored`);
console.log(`Using ${stats.data.storageBackend} backend`);

// Export all data
const exportResult = await exportAllData();
const data = exportResult.data; // { problems, solutions, replays }

// Import data
const importResult = await importAllData({
  problems: [/* problems array */],
  solutions: [/* solutions array */],
  replays: [/* replays array */]
});

// Download as file
await downloadDataAsFile();

// Import from file
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
await importDataFromFile(file);

// Clear all data
await clearAllData();
```

## Storage Backends

### IndexedDB (Primary)
- Structured database with indexes
- Better performance for large datasets
- Supports complex queries
- Higher storage quota

### localStorage (Fallback)
- Simple key-value storage
- Better compatibility
- Size limitations (~5-10MB)
- Fallback when IndexedDB unavailable

## Error Handling

All functions return a `Result<T>` type:

```typescript
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// Usage
const result = await loadProblem('some-id');
if (result.success) {
  console.log('Problem:', result.data);
} else {
  console.error('Error:', result.error);
}
```

## Testing

```bash
npm test
```

The test suite covers:
- CRUD operations for all entity types
- Data validation and error handling
- Storage backend switching
- Import/export functionality
- Storage statistics and management

## Architecture

```
src/lib/persist/
├── types.ts              # Type definitions
├── storage.interface.ts  # Abstract storage interface
├── indexeddb.adapter.ts  # IndexedDB implementation
├── localstorage.adapter.ts # localStorage implementation
├── persistence.manager.ts # Backend selection and management
├── use-cases.ts          # High-level API functions
├── index.ts              # Public exports
├── persist.test.ts       # Test suite
└── README.md             # This file
```

## Human-Readable JSON

All JSON keys are designed to be self-documenting:

```json
{
  "id": "prob-123",
  "title": "T-Spin Double Setup",
  "tags": ["T-spin", "beginner"],
  "fumen": "v115@...",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "description": "Learn basic T-spin mechanics",
  "difficulty": 3,
  "author": "TeacherBot"
}
```

This design facilitates:
- LLM analysis and understanding
- Human debugging and inspection
- API documentation and examples
- Data interchange between systems