"use strict";

class Piece {
    constructor(player, king = false) {
        this.player = player; // 1 for player, -1 for AI
        this.king = king;
    }
}

class Game {
    constructor() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        this.currentPlayer = 1; // Player starts
        this.selectedPiece = null;
        this.validMoves = [];
        this.mandatoryJumps = [];
        this.initializeBoard();
        this.renderBoard();
        this.setupEventListeners();
    }

    initializeBoard() {
        // Set up initial piece positions
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    if (row < 3) {
                        this.board[row][col] = new Piece(-1); // AI pieces
                    } else if (row > 4) {
                        this.board[row][col] = new Piece(1); // Player pieces
                    }
                }
            }
        }
    }

    renderBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = `cell ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
                cell.dataset.row = row;
                cell.dataset.col = col;

                if (this.board[row][col]) {
                    const piece = document.createElement('div');
                    piece.className = `piece ${this.board[row][col].player === 1 ? 'white' : 'black'}`;
                    if (this.board[row][col].king) {
                        piece.classList.add('king');
                    }
                    cell.appendChild(piece);
                }

                if (this.validMoves.some(move => move.toRow === row && move.toCol === col)) {
                    cell.classList.add('highlighted');
                }

                if (this.selectedPiece && 
                    this.selectedPiece.row === row && 
                    this.selectedPiece.col === col) {
                    cell.classList.add('selected');
                }

                boardElement.appendChild(cell);
            }
        }
    }

    setupEventListeners() {
        document.getElementById('board').addEventListener('click', (e) => {
            const cell = e.target.closest('.cell');
            if (!cell) return;

            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            this.handleCellClick(row, col);
        });

        document.getElementById('newGame').addEventListener('click', () => {
            this.resetGame();
        });
    }

    handleCellClick(row, col) {
        if (this.currentPlayer !== 1) return; // Only allow player moves

        const piece = this.board[row][col];

        // If selecting a piece
        if (piece && piece.player === this.currentPlayer) {
            this.selectedPiece = { row, col };
            this.validMoves = this.getValidMoves(row, col);
            this.renderBoard();
            return;
        }

        // If selecting a destination
        if (this.selectedPiece) {
            const move = this.validMoves.find(m => m.toRow === row && m.toCol === col);
            if (move) {
                this.makeMove(move);
                this.selectedPiece = null;
                this.validMoves = [];
                this.renderBoard();
                
                setTimeout(() => {
                    this.makeAIMove();
                }, 500);
            }
        }
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const jumps = [];
        const directions = piece.king ? [-1, 1] : [piece.player];

        // Check for jumps
        for (let dRow of directions) {
            for (let dCol of [-1, 1]) {
                if (this.canJump(row, col, dRow, dCol)) {
                    jumps.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: row + 2 * dRow,
                        toCol: col + 2 * dCol,
                        isJump: true
                    });
                }
            }
        }

        // If jumps are available, they are mandatory
        if (jumps.length > 0) return jumps;

        // Check for regular moves
        for (let dRow of directions) {
            for (let dCol of [-1, 1]) {
                const newRow = row + dRow;
                const newCol = col + dCol;
                if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
                    moves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: newRow,
                        toCol: newCol,
                        isJump: false
                    });
                }
            }
        }

        return moves;
    }

    canJump(row, col, dRow, dCol) {
        const jumpRow = row + 2 * dRow;
        const jumpCol = col + 2 * dCol;
        const midRow = row + dRow;
        const midCol = col + dCol;

        if (!this.isValidPosition(jumpRow, jumpCol)) return false;

        const jumpOver = this.board[midRow][midCol];
        return jumpOver && 
               jumpOver.player !== this.board[row][col].player && 
               !this.board[jumpRow][jumpCol];
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    makeMove(move) {
        const piece = this.board[move.fromRow][move.fromCol];
        this.board[move.toRow][move.toCol] = piece;
        this.board[move.fromRow][move.fromCol] = null;

        // Handle jumps
        if (move.isJump) {
            const midRow = (move.fromRow + move.toRow) / 2;
            const midCol = (move.fromCol + move.toCol) / 2;
            this.board[midRow][midCol] = null;
        }

        // King promotion
        if ((piece.player === 1 && move.toRow === 0) || 
            (piece.player === -1 && move.toRow === 7)) {
            piece.king = true;
        }

        this.currentPlayer *= -1;
        document.getElementById('status').textContent = 
            this.currentPlayer === 1 ? 'Your turn' : 'AI thinking...';
    }

    makeAIMove() {
        const move = this.findBestMove();
        if (move) {
            this.makeMove(move);
            this.renderBoard();
        }
    }

    findBestMove() {
        const depth = 6; // Adjust for difficulty
        let bestMove = null;
        let bestValue = -Infinity;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.player === this.currentPlayer) {
                    const moves = this.getValidMoves(row, col);
                    for (const move of moves) {
                        // Make move
                        const originalBoard = this.cloneBoard();
                        this.makeMove(move);

                        // Evaluate position
                        const value = this.minimax(depth - 1, -Infinity, Infinity, false);

                        // Undo move
                        this.board = originalBoard;
                        this.currentPlayer *= -1;

                        if (value > bestValue) {
                            bestValue = value;
                            bestMove = move;
                        }
                    }
                }
            }
        }

        return bestMove;
    }

    minimax(depth, alpha, beta, maximizingPlayer) {
        if (depth === 0) return this.evaluatePosition();

        if (maximizingPlayer) {
            let maxEval = -Infinity;
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = this.board[row][col];
                    if (piece && piece.player === this.currentPlayer) {
                        const moves = this.getValidMoves(row, col);
                        for (const move of moves) {
                            const originalBoard = this.cloneBoard();
                            this.makeMove(move);
                            const eval = this.minimax(depth - 1, alpha, beta, false);
                            this.board = originalBoard;
                            this.currentPlayer *= -1;
                            maxEval = Math.max(maxEval, eval);
                            alpha = Math.max(alpha, eval);
                            if (beta <= alpha) break;
                        }
                    }
                }
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = this.board[row][col];
                    if (piece && piece.player === this.currentPlayer) {
                        const moves = this.getValidMoves(row, col);
                        for (const move of moves) {
                            const originalBoard = this.cloneBoard();
                            this.makeMove(move);
                            const eval = this.minimax(depth - 1, alpha, beta, true);
                            this.board = originalBoard;
                            this.currentPlayer *= -1;
                            minEval = Math.min(minEval, eval);
                            beta = Math.min(beta, eval);
                            if (beta <= alpha) break;
                        }
                    }
                }
            }
            return minEval;
        }
    }

    evaluatePosition() {
        let score = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    let value = piece.king ? 3 : 1;
                    score += piece.player * value;
                    
                    // Position-based scoring
                    if (piece.player === -1) { // AI pieces
                        score += (7 - row) * 0.1; // Encourage forward movement
                    } else {
                        score -= row * 0.1;
                    }
                }
            }
        }
        return score;
    }

    cloneBoard() {
        return this.board.map(row => 
            row.map(cell => 
                cell ? new Piece(cell.player, cell.king) : null
            )
        );
    }

    resetGame() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        this.currentPlayer = 1;
        this.selectedPiece = null;
        this.validMoves = [];
        this.initializeBoard();
        this.renderBoard();
        document.getElementById('status').textContent = 'Your turn';
    }
}

// Start the game
window.onload = () => {
    new Game();
};
