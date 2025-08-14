import React from 'react';
import type { Board as BoardType, Piece, PieceType, Cell } from '../types';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../types';
import { getGhostPosition, getVisibleBoard } from '../rules';
import './Board.css';

interface BoardProps {
  board: BoardType;
  currentPiece: Piece | null;
  nextPieces: PieceType[];
  heldPiece: PieceType | null;
  showGhost?: boolean;
  onCellClick?: (row: number, col: number) => void;
}

const CELL_SIZE = 30;
const BOARD_PIXEL_WIDTH = BOARD_WIDTH * CELL_SIZE;
const BOARD_PIXEL_HEIGHT = BOARD_HEIGHT * CELL_SIZE;

const PIECE_COLORS: Record<PieceType | 'ghost', string> = {
  'I': '#00f0f0',
  'O': '#f0f000',
  'T': '#a000f0',
  'S': '#00f000',
  'Z': '#f00000',
  'J': '#0000f0',
  'L': '#f0a000',
  'ghost': '#666666'
};

export const BoardRenderer: React.FC<BoardProps> = ({
  board,
  currentPiece,
  nextPieces,
  heldPiece,
  showGhost = true,
  onCellClick
}) => {
  const visibleBoard = getVisibleBoard(board);
  const ghostPosition = currentPiece && showGhost ? getGhostPosition(board, currentPiece) : null;
  
  const renderCell = (cell: Cell, row: number, col: number, isGhost = false) => {
    const color = isGhost ? PIECE_COLORS.ghost : (cell ? PIECE_COLORS[cell] : '#222');
    const className = `cell ${cell ? 'filled' : ''} ${isGhost ? 'ghost' : ''} ${onCellClick ? 'clickable' : ''}`;
    
    const handleClick = onCellClick ? () => onCellClick(row + BOARD_HEIGHT, col) : undefined;
    
    return (
      <div
        key={`${row}-${col}`}
        className={className}
        style={{
          backgroundColor: color,
          left: col * CELL_SIZE,
          top: row * CELL_SIZE,
          width: CELL_SIZE,
          height: CELL_SIZE,
        }}
        onClick={handleClick}
      />
    );
  };
  
  const renderPiece = (piece: Piece, isGhost = false) => {
    const cells: React.ReactElement[] = [];
    const { matrix, position } = piece;
    
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (matrix[row][col]) {
          const boardRow = position.y + row - BOARD_HEIGHT;
          const boardCol = position.x + col;
          
          if (boardRow >= 0 && boardRow < BOARD_HEIGHT && boardCol >= 0 && boardCol < BOARD_WIDTH) {
            cells.push(renderCell(piece.type, boardRow, boardCol, isGhost));
          }
        }
      }
    }
    
    return cells;
  };
  
  const renderMiniPiece = (pieceType: PieceType | null, scale = 0.7) => {
    if (!pieceType) return null;
    
    // Simplified piece shapes for preview
    const shapes: Record<PieceType, number[][]> = {
      'I': [[1,1,1,1]],
      'O': [[1,1],[1,1]],
      'T': [[0,1,0],[1,1,1]],
      'S': [[0,1,1],[1,1,0]],
      'Z': [[1,1,0],[0,1,1]],
      'J': [[1,0,0],[1,1,1]],
      'L': [[0,0,1],[1,1,1]]
    };
    
    const shape = shapes[pieceType];
    const cellSize = CELL_SIZE * scale;
    
    return (
      <div className="mini-piece">
        {shape.map((row, rowIndex) => (
          <div key={rowIndex} style={{ display: 'flex' }}>
            {row.map((cell, colIndex) => (
              <div
                key={colIndex}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: cell ? PIECE_COLORS[pieceType] : 'transparent',
                  border: cell ? '1px solid rgba(255,255,255,0.3)' : 'none'
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="game-container">
      <div className="side-panel">
        <div className="hold-box">
          <h3>HOLD</h3>
          <div className="piece-preview">
            {renderMiniPiece(heldPiece)}
          </div>
        </div>
      </div>
      
      <div className="board-container" style={{ width: BOARD_PIXEL_WIDTH, height: BOARD_PIXEL_HEIGHT }}>
        <div className="board">
          {/* Render board cells */}
          {visibleBoard.map((row, rowIndex) =>
            row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))
          )}
          
          {/* Render ghost piece */}
          {ghostPosition && currentPiece && renderPiece({
            ...currentPiece,
            position: ghostPosition
          }, true)}
          
          {/* Render current piece */}
          {currentPiece && renderPiece(currentPiece)}
        </div>
      </div>
      
      <div className="side-panel">
        <div className="next-box">
          <h3>NEXT</h3>
          {nextPieces.slice(0, 5).map((pieceType, index) => (
            <div key={index} className="piece-preview">
              {renderMiniPiece(pieceType, index === 0 ? 0.8 : 0.6)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};