class Piece {
    constructor(player, king = false) {
        this.player = player; // 1 for human, -1 for AI
        this.king = king;
    }
}

class Game {
    constructor() {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        this.currentPlayer = 1;
        this.selectedPiece = null;
        this.validMoves = [];
        this.initializeBoard();
        this.renderBoard();
        this.setupEventListeners();
    }

    initializeBoard() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    if (row < 3) this.board[row][col] = new Piece(-1);
                    else if (row > 4) this.board[row][col] = new Piece(1);
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
                    if (this.board[row][col].king) piece.classList.add('king');
                    cell.appendChild(piece);
                }
                if (this.validMoves.some(m => m.toRow === row && m.toCol === col)) {
                    cell.classList.add('highlighted');
                }
                if (this.selectedPiece?.row === row && this.selectedPiece?.col === col) {
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
        document.getElementById('newGame').addEventListener('click', () => this.resetGame());
    }

    handleCellClick(row, col) {
        if (this.currentPlayer !== 1) return;
        const piece = this.board[row][col];
        const mandatoryJumps = this.getAllMandatoryJumps();
        
        if (mandatoryJumps.length > 0 && !mandatoryJumps.some(j => j.fromRow === row && j.fromCol === col)) return;
        
        if (piece?.player === 1) {
            this.selectedPiece = { row, col };
            this.validMoves = this.getValidMoves(row, col);
            if (mandatoryJumps.length > 0) {
                this.validMoves = this.validMoves.filter(m => m.isJump);
            }
            this.renderBoard();
            return;
        }
        
        if (this.selectedPiece) {
            const move = this.validMoves.find(m => m.toRow === row && m.toCol === col);
            if (move) {
                this.makeMove(move);
                if (!move.isJump || !this.getValidMoves(move.toRow, move.toCol).some(m => m.isJump)) {
                    this.currentPlayer = -1;
                    setTimeout(() => this.makeAIMove(), 500);
                }
                this.selectedPiece = null;
                this.validMoves = [];
                this.renderBoard();
            }
        }
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];
        const moves = [];
        const directions = piece.king ? [-1, 1] : [piece.player];
        
        // Check jumps
        for (const dRow of directions) {
            for (const dCol of [-1, 1]) {
                let jumpRow = row + dRow * 2;
                let jumpCol = col + dCol * 2;
                let midRow = row + dRow;
                let midCol = col + dCol;
                if (this.isValidJump(row, col, dRow, dCol)) {
                    moves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: jumpRow,
                        toCol: jumpCol,
                        isJump: true,
                        capturedRow: midRow,
                        capturedCol: midCol
                    });
                }
            }
        }
        
        // Regular moves (only if no jumps)
        if (moves.length === 0) {
            for (const dRow of directions) {
                for (const dCol of [-1, 1]) {
                    let step = 1;
                    while (true) {
                        const newRow = row + dRow * step;
                        const newCol = col + dCol * step;
                        if (!this.isValidPosition(newRow, newCol) break;
                        if (this.board[newRow][newCol]) break;
                        moves.push({
                            fromRow: row,
                            fromCol: col,
                            toRow: newRow,
                            toCol: newCol,
                            isJump: false
                        });
                        if (!piece.king) break;
                        step++;
                    }
                }
            }
        }
        return moves;
    }

    isValidJump(fromRow, fromCol, dRow, dCol) {
        const midRow = fromRow + dRow;
        const midCol = fromCol + dCol;
        const jumpRow = fromRow + dRow * 2;
        const jumpCol = fromCol + dCol * 2;
        return this.isValidPosition(jumpRow, jumpCol) &&
            this.board[midRow][midCol]?.player === -this.board[fromRow][fromCol].player &&
            !this.board[jumpRow][jumpCol];
    }

    makeMove(move) {
        const piece = this.board[move.fromRow][move.fromCol];
        this.board[move.toRow][move.toCol] = piece;
        this.board[move.fromRow][move.fromCol] = null;
        
        if (move.isJump) {
            this.board[move.capturedRow][move.capturedCol] = null;
        }
        
        if ((piece.player === 1 && move.toRow === 0) || (piece.player === -1 && move.toRow === 7)) {
            piece.king = true;
        }
        
        document.getElementById('status').textContent = 
            this.currentPlayer === 1 ? 'Your turn' : 'AI thinking...';
    }

    getAllMandatoryJumps() {
        const jumps = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col]?.player === this.currentPlayer) {
                    jumps.push(...this.getValidMoves(row, col).filter(m => m.isJump));
                }
            }
        }
        return jumps;
    }

    makeAIMove() {
        const move = this.findBestMove();
        if (move) {
            this.makeMove(move);
            this.currentPlayer = 1;
            this.renderBoard();
        }
    }

    findBestMove() {
        const depth = 5;
        let bestValue = -Infinity;
        let bestMove = null;
        
        for (const move of this.getAllValidMoves(-1)) {
            const originalBoard = this.cloneBoard();
            this.makeMove(move);
            const value = this.minimax(depth - 1, -Infinity, Infinity, false);
            this.board = originalBoard;
            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }
        return bestMove;
    }

    minimax(depth, alpha, beta, maximizingPlayer) {
        if (depth === 0) return this.evaluatePosition();
        const currentPlayer = maximizingPlayer ? 1 : -1;
        let bestValue = maximizingPlayer ? -Infinity : Infinity;
        
        for (const move of this.getAllValidMoves(currentPlayer)) {
            const originalBoard = this.cloneBoard();
            this.makeMove(move);
            const value = this.minimax(depth - 1, alpha, beta, !maximizingPlayer);
            this.board = originalBoard;
            
            if (maximizingPlayer) {
                bestValue = Math.max(bestValue, value);
                alpha = Math.max(alpha, value);
            } else {
                bestValue = Math.min(bestValue, value);
                beta = Math.min(beta, value);
            }
            
            if (beta <= alpha) break;
        }
        return bestValue;
    }

    getAllValidMoves(player) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col]?.player === player) {
                    moves.push(...this.getValidMoves(row, col));
                }
            }
        }
        return moves;
    }

    evaluatePosition() {
        let score = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    let value = piece.king ? 3 : 1;
                    score += piece.player * value;
                    if (piece.player === -1) score += (7 - row) * 0.1;
                    else score -= row * 0.1;
                }
            }
        }
        return score;
    }

    cloneBoard() {
        return this.board.map(row => row.map(cell => cell ? new Piece(cell.player, cell.king) : null));
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    resetGame() {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        this.currentPlayer = 1;
        this.selectedPiece = null;
        this.validMoves = [];
        this.initializeBoard();
        this.renderBoard();
        document.getElementById('status').textContent = 'Your turn';
    }
}

window.onload = () => new Game();
