import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { GameProvider, useGame } from './GameContext';
import { KeyConfigProvider } from './KeyConfigContext';

vi.mock('../lib/persist', () => ({
  initializePersistence: vi.fn(async () => ({ success: true })),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <KeyConfigProvider>
    <GameProvider>{children}</GameProvider>
  </KeyConfigProvider>
);

describe('GameContext - seven bag and NEXT integration', () => {
  it('initializes next queue and advances after starting the game', async () => {
    const { result } = renderHook(() => useGame(), { wrapper });

    // Wait for any pending effects (e.g., persistence init)
    await act(async () => {});

    const initialNext = result.current.state.gameState.nextPieces;
    expect(initialNext).toHaveLength(5);

    await act(async () => {
      result.current.actions.startGame();
    });

    const state = result.current.state.gameState;
    expect(state.currentPiece?.type).toBe(initialNext[0]);
    expect(state.nextPieces.slice(0, 4)).toEqual(initialNext.slice(1));
  });
});
