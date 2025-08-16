# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Advanced Tetris simulation application with multiple game modes (Simulation, REN, T-Spin, Drill, Optimization). Built with React, TypeScript, and Vite, featuring SRS (Super Rotation System) mechanics, persistence layer with IndexedDB, and sophisticated game state management with keyboard and gamepad support.

## Common Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:5173)
npm run dev

# Type check and build for production
npm run build

# Run ESLint
npm run lint

# Run tests with Vitest
npm test

# Run tests with UI
npm run test:ui

# Preview production build
npm run preview
```

## Architecture and Code Structure

### Technology Stack
- **React 19.1.1** with React Router for SPA routing
- **TypeScript 5.8.3** with strict mode enabled
- **Vite 7.1.2** for bundling and dev server
- **Vitest** for unit testing (configured in vite.config.ts)
- **IndexedDB** (via idb library) for persistence
- **React Context** for global game state management

### High-Level Architecture

The application follows a modular architecture with clear separation of concerns:

1. **Game Engine Core** (`src/game/`)
   - `srs.ts`: Super Rotation System implementation with kick tables for all 7 tetromino types
   - `rules.ts`: Game rules including collision detection, line clearing, and board operations
   - `bag.ts`: 7-bag randomizer for piece generation
   - `input.ts`: Keyboard input handler with DAS (Delayed Auto Shift) and ARR (Auto Repeat Rate)
   - `gamepad.ts`: Gamepad input handler with configurable button mappings
   - `types.ts`: Core type definitions (Board is Cell[][], pieces have rotation states 0-3)

2. **State Management** 
   - `src/contexts/GameContext.tsx`: Centralized game state using useReducer pattern with move recording/undo
   - `src/contexts/KeyConfigContext.tsx`: Global keyboard and gamepad configuration management

3. **Persistence Layer** (`src/lib/persist/`)
   - Abstract storage interface supporting both IndexedDB and LocalStorage
   - Use cases for problems, solutions, and replays
   - Automatic fallback mechanism when IndexedDB unavailable
   - Human-readable JSON keys for LLM analysis

4. **Routing Structure**
   - `/simulation` - Free play mode with full controls
   - `/ren` - REN (consecutive line clear) practice
   - `/tspin` - T-Spin technique training
   - `/drill` - Speed and accuracy drills
   - `/optimization` - Piece placement optimization challenges

### Key Game Mechanics

- **Board**: 10x10 grid with 20 visible rows + 20 buffer rows (40 total height)
- **SRS Rotation**: Standard rotation with wall kicks for all pieces
- **Input Timing**: Configurable DAS (default 10 frames), ARR (default 2 frames), soft drop speed (default 20 cells/sec)
- **Lock Delay**: 30 frames (500ms) with up to 15 lock resets
- **Hold Feature**: Standard hold mechanics with one-per-drop limitation
- **Input Support**: Both keyboard and gamepad with customizable key/button mappings

## TypeScript Configuration

Strict TypeScript with project references:
- `tsconfig.app.json` - Application code (excludes tests)
- `tsconfig.node.json` - Node/build scripts
- Target: ES2022, Module: ESNext with bundler resolution
- Strict null checks, no implicit any, no unused locals/parameters

## Testing

Tests are configured through Vite with Vitest:
- Test files: `**/*.test.ts` and `**/*.test.tsx`
- Environment: jsdom
- Setup file: `./src/test/setup.ts`
- Run with `npm test` or `npm run test:ui` for interactive UI