import { describe, it, expect, beforeEach } from 'vitest';
import { SevenBag, createBagGenerator } from './bag';
import type { PieceType } from './types';

describe('SevenBag', () => {
  let bag: SevenBag;
  
  beforeEach(() => {
    bag = new SevenBag();
  });
  
  it('should generate all 7 pieces in first 7 calls', () => {
    const pieces: PieceType[] = [];
    for (let i = 0; i < 7; i++) {
      pieces.push(bag.next());
    }
    
    const sortedPieces = [...pieces].sort();
    const expectedPieces = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'].sort();
    
    expect(sortedPieces).toEqual(expectedPieces);
  });
  
  it('should generate all 7 pieces in next 7 calls', () => {
    // First bag
    for (let i = 0; i < 7; i++) {
      bag.next();
    }
    
    // Second bag
    const pieces: PieceType[] = [];
    for (let i = 0; i < 7; i++) {
      pieces.push(bag.next());
    }
    
    const sortedPieces = [...pieces].sort();
    const expectedPieces = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'].sort();
    
    expect(sortedPieces).toEqual(expectedPieces);
  });
  
  it('should not have duplicate pieces in any 7-piece sequence', () => {
    for (let iteration = 0; iteration < 10; iteration++) {
      const pieces: PieceType[] = [];
      for (let i = 0; i < 7; i++) {
        pieces.push(bag.next());
      }
      
      const uniquePieces = new Set(pieces);
      expect(uniquePieces.size).toBe(7);
    }
  });
  
  it('should peek without consuming pieces', () => {
    const peeked = bag.peek(3);
    expect(peeked).toHaveLength(3);
    
    const next1 = bag.next();
    const next2 = bag.next();
    const next3 = bag.next();
    
    expect(next1).toBe(peeked[0]);
    expect(next2).toBe(peeked[1]);
    expect(next3).toBe(peeked[2]);
  });
  
  it('should peek across bag boundaries', () => {
    // Consume most of first bag
    for (let i = 0; i < 5; i++) {
      bag.next();
    }
    
    const peeked = bag.peek(5);
    expect(peeked).toHaveLength(5);
    
    // Verify we get the same pieces when calling next
    for (let i = 0; i < 5; i++) {
      expect(bag.next()).toBe(peeked[i]);
    }
  });
  
  it('should reset and generate new sequence', () => {
    const firstSequence: PieceType[] = [];
    for (let i = 0; i < 3; i++) {
      firstSequence.push(bag.next());
    }
    
    bag.reset();
    
    const secondSequence: PieceType[] = [];
    for (let i = 0; i < 7; i++) {
      secondSequence.push(bag.next());
    }
    
    // Should have all 7 pieces after reset
    const sortedPieces = [...secondSequence].sort();
    const expectedPieces = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'].sort();
    expect(sortedPieces).toEqual(expectedPieces);
  });
  
  describe('Distribution Test', () => {
    it('should have uniform distribution over many iterations', () => {
      const counts: Record<PieceType, number> = {
        'I': 0, 'O': 0, 'T': 0, 'S': 0, 'Z': 0, 'J': 0, 'L': 0
      };
      
      const iterations = 7000; // 1000 complete bags
      
      for (let i = 0; i < iterations; i++) {
        const piece = bag.next();
        counts[piece]++;
      }
      
      // Each piece should appear exactly 1000 times
      Object.values(counts).forEach(count => {
        expect(count).toBe(1000);
      });
    });
    
    it('should not have long droughts of any piece', () => {
      const lastSeen: Record<PieceType, number> = {
        'I': -1, 'O': -1, 'T': -1, 'S': -1, 'Z': -1, 'J': -1, 'L': -1
      };
      
      let maxDrought = 0;
      
      for (let i = 0; i < 140; i++) { // 20 bags
        const piece = bag.next();
        
        if (lastSeen[piece] !== -1) {
          const drought = i - lastSeen[piece];
          maxDrought = Math.max(maxDrought, drought);
        }
        
        lastSeen[piece] = i;
      }
      
      // With 7-bag, max drought should be at most 12
      // (worst case: piece is first in bag N, last in bag N+1)
      expect(maxDrought).toBeLessThanOrEqual(13);
    });
  });
  
  describe('createBagGenerator', () => {
    it('should create a working bag generator', () => {
      const generator = createBagGenerator();
      
      const pieces: PieceType[] = [];
      for (let i = 0; i < 7; i++) {
        pieces.push(generator.next());
      }
      
      const uniquePieces = new Set(pieces);
      expect(uniquePieces.size).toBe(7);
    });
  });
});