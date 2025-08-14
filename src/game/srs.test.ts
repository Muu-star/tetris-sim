import { describe, it, expect } from 'vitest';
import { getKickTable, rotatePiece, createPiece, PIECE_MATRICES } from './srs';
import type { PieceType, RotationState } from './types';

describe('SRS Kick Tables', () => {
  describe('getKickTable', () => {
    it('should return correct kicks for JLSTZ pieces', () => {
      const pieces: PieceType[] = ['J', 'L', 'S', 'T', 'Z'];
      
      pieces.forEach(pieceType => {
        const kicks01 = getKickTable(pieceType, 0, 1);
        expect(kicks01).toEqual([
          { x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }
        ]);
        
        const kicks10 = getKickTable(pieceType, 1, 0);
        expect(kicks10).toEqual([
          { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }
        ]);
      });
    });
    
    it('should return correct kicks for I piece', () => {
      const kicks01 = getKickTable('I', 0, 1);
      expect(kicks01).toEqual([
        { x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 2 }
      ]);
      
      const kicks12 = getKickTable('I', 1, 2);
      expect(kicks12).toEqual([
        { x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 2 }, { x: 2, y: -1 }
      ]);
    });
    
    it('should return no kicks for O piece', () => {
      const kicks = getKickTable('O', 0, 1);
      expect(kicks).toEqual([{ x: 0, y: 0 }]);
    });
    
    it('should handle all rotation transitions', () => {
      const rotations: RotationState[] = [0, 1, 2, 3];
      const pieces: PieceType[] = ['I', 'T', 'S', 'Z', 'J', 'L'];
      
      pieces.forEach(pieceType => {
        rotations.forEach(from => {
          rotations.forEach(to => {
            if (from !== to) {
              const kicks = getKickTable(pieceType, from, to);
              expect(kicks).toHaveLength(5);
              expect(kicks[0]).toEqual({ x: 0, y: 0 });
            }
          });
        });
      });
    });
  });
  
  describe('rotatePiece', () => {
    it('should rotate clockwise correctly', () => {
      const piece = createPiece('T');
      
      const rotated1 = rotatePiece(piece, true);
      expect(rotated1.rotation).toBe(1);
      expect(rotated1.matrix).toEqual(PIECE_MATRICES['T'][1]);
      
      const rotated2 = rotatePiece(rotated1, true);
      expect(rotated2.rotation).toBe(2);
      
      const rotated3 = rotatePiece(rotated2, true);
      expect(rotated3.rotation).toBe(3);
      
      const rotated4 = rotatePiece(rotated3, true);
      expect(rotated4.rotation).toBe(0);
    });
    
    it('should rotate counter-clockwise correctly', () => {
      const piece = createPiece('T');
      
      const rotated1 = rotatePiece(piece, false);
      expect(rotated1.rotation).toBe(3);
      expect(rotated1.matrix).toEqual(PIECE_MATRICES['T'][3]);
      
      const rotated2 = rotatePiece(rotated1, false);
      expect(rotated2.rotation).toBe(2);
      
      const rotated3 = rotatePiece(rotated2, false);
      expect(rotated3.rotation).toBe(1);
      
      const rotated4 = rotatePiece(rotated3, false);
      expect(rotated4.rotation).toBe(0);
    });
  });
  
  describe('createPiece', () => {
    it('should create piece with default position', () => {
      const piece = createPiece('T');
      expect(piece.type).toBe('T');
      expect(piece.position).toEqual({ x: 3, y: 19 });
      expect(piece.rotation).toBe(0);
      expect(piece.matrix).toEqual(PIECE_MATRICES['T'][0]);
    });
    
    it('should create piece with custom position', () => {
      const piece = createPiece('I', 5, 10);
      expect(piece.position).toEqual({ x: 5, y: 10 });
    });
  });
  
  describe('Piece Matrices', () => {
    it('should have correct dimensions for all pieces', () => {
      Object.entries(PIECE_MATRICES).forEach(([type, rotations]) => {
        expect(rotations).toHaveLength(4);
        
        rotations.forEach((matrix) => {
          if (type === 'I' || type === 'O') {
            expect(matrix).toHaveLength(4);
            expect(matrix[0]).toHaveLength(4);
          } else {
            expect(matrix).toHaveLength(3);
            expect(matrix[0]).toHaveLength(3);
          }
        });
      });
    });
    
    it('should have correct piece shapes', () => {
      // Test T piece shape in rotation 0
      const tShape = PIECE_MATRICES['T'][0];
      expect(tShape).toEqual([
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
      ]);
      
      // Test I piece shape in rotation 0
      const iShape = PIECE_MATRICES['I'][0];
      expect(iShape).toEqual([
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]);
    });
  });
});