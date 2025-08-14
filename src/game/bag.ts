import type { PieceType, BagGenerator } from './types';

export class SevenBag implements BagGenerator {
  private pieces: PieceType[] = [];
  private readonly allPieces: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  
  constructor() {
    this.refillBag();
  }
  
  next(): PieceType {
    if (this.pieces.length === 0) {
      this.refillBag();
    }
    return this.pieces.shift()!;
  }
  
  peek(count: number): PieceType[] {
    while (this.pieces.length < count) {
      this.refillBag();
    }
    return this.pieces.slice(0, count);
  }
  
  reset(): void {
    this.pieces = [];
    this.refillBag();
  }
  
  private refillBag(): void {
    const newBag = [...this.allPieces];
    
    // Fisher-Yates shuffle
    for (let i = newBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
    }
    
    this.pieces.push(...newBag);
  }
}

export function createBagGenerator(): BagGenerator {
  return new SevenBag();
}