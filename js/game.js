class HexChessGame {
    constructor(boardId, isOnline = false) {
        this.board = new HexBoard(boardId);
        this.pieceManager = new PieceManager(this.board);
        this.validator = new MoveValidator(this.pieceManager);
        this.currentTurn = 'white';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameStatus = 'active';
        this.isOnline = isOnline;
        
        if (isOnline) {
            this.firebase = new FirebaseManager();
            this.firebase.onUpdate((gameData) => this.onRemoteUpdate(gameData));
        }
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateUI();
    }
    
    setupEventListeners() {
        // Override board click handler to include game logic
        this.board.onHexClick = (q, r) => this.handleHexClick(q, r);
        
        // Control buttons
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        document.getElementById('undo-move').addEventListener('click', () => this.undoMove());
        document.getElementById('resign').addEventListener('click', () => this.resign());
        
        if (this.isOnline) {
            document.getElementById('create-game').addEventListener('click', () => this.createOnlineGame());
            document.getElementById('join-game').addEventListener('click', () => this.joinOnlineGame());
        }
    }
    
    handleHexClick(q, r) {
        const hexKey = `${q},${r}`;
        const hex = this.board.getHexAt(q, r);
        const piece = this.pieceManager.getPieceAt(q, r);
        
        if (this.board.selectedHex) {
            if (this.board.selectedHex === hexKey) {
                hex.classList.remove('selected');
                this.board.selectedHex = null;
            } else {
                this.attemptMove(this.board.selectedHex, hexKey);
            }
        } else if (piece && piece.color === this.currentTurn) {
            hex.classList.add('selected');
            this.board.selectedHex = hexKey;
        }
    }
    
    attemptMove(fromKey, toKey) {
        const [fromQ, fromR] = fromKey.split(',').map(Number);
        const [toQ, toR] = toKey.split(',').map(Number);
        
        const piece = this.pieceManager.getPieceAt(fromQ, fromR);
        const targetPiece = this.pieceManager.getPieceAt(toQ, toR);
        
        if (!piece || piece.color !== this.currentTurn) {
            return false;
        }
        
        if (targetPiece && targetPiece.color === piece.color) {
            return false;
        }
        
        if (this.isValidMove(piece, fromQ, fromR, toQ, toR)) {
            this.makeMove(fromQ, fromR, toQ, toR);
            return true;
        }
        
        return false;
    }
    
    isValidMove(piece, fromQ, fromR, toQ, toR) {
        // Use the validator for comprehensive move validation
        if (!this.validator.canPieceAttack(piece, fromQ, fromR, toQ, toR)) {
            return false;
        }
        
        // Check if move would leave king in check
        if (this.validator.wouldBeInCheck(fromQ, fromR, toQ, toR, piece.color)) {
            return false;
        }
        
        // Special pawn rules
        if (piece.type === 'pawn') {
            const dq = toQ - fromQ;
            const dr = toR - fromR;
            return this.isValidPawnMove(piece, fromQ, fromR, toQ, toR, dq, dr);
        }
        
        return true;
    }
    
    isValidPawnMove(piece, fromQ, fromR, toQ, toR, dq, dr) {
        const direction = piece.color === 'white' ? 1 : -1;
        const targetPiece = this.pieceManager.getPieceAt(toQ, toR);
        
        // Center pawn special rule - cannot move 2 spaces
        const isCenterPawn = fromQ === 0;
        
        // Forward move
        if (!targetPiece && dr === direction && dq === 0) {
            return true;
        }
        
        // Initial two-space move (not for center pawn)
        if (!piece.hasMoved && !isCenterPawn && !targetPiece && dr === 2 * direction && dq === 0) {
            // Check if path is clear
            const middleQ = fromQ;
            const middleR = fromR + direction;
            if (!this.pieceManager.getPieceAt(middleQ, middleR)) {
                return true;
            }
        }
        
        // Capture diagonally
        if (targetPiece && targetPiece.color !== piece.color) {
            if (dr === direction && (dq === 1 || dq === -1)) {
                return true;
            }
        }
        
        return false;
    }
    
    isValidRookMove(dq, dr) {
        return dq === 0 || dr === 0 || dq === -dr;
    }
    
    isValidKnightMove(dq, dr) {
        const knightMoves = [
            [2, -1], [1, -2], [-1, -1], [-2, 0],
            [-2, 1], [-1, 2], [1, 1], [2, 0],
            [3, -2], [2, -3], [-2, -1], [-3, 0],
            [-3, 1], [-2, 2], [1, 2], [2, 1]
        ];
        return knightMoves.some(([mq, mr]) => dq === mq && dr === mr);
    }
    
    isValidBishopMove(dq, dr) {
        return dq === dr || dq === 2 * dr || dr === 2 * dq;
    }
    
    isValidQueenMove(dq, dr) {
        return this.isValidRookMove(dq, dr) || this.isValidBishopMove(dq, dr);
    }
    
    isValidKingMove(dq, dr) {
        return Math.abs(dq) <= 1 && Math.abs(dr) <= 1;
    }
    
    makeMove(fromQ, fromR, toQ, toR) {
        const piece = this.pieceManager.getPieceAt(fromQ, fromR);
        const targetPiece = this.pieceManager.getPieceAt(toQ, toR);
        
        // Capture piece if present
        if (targetPiece) {
            this.capturedPieces[targetPiece.color].push(targetPiece);
        }
        
        // Move piece
        this.pieceManager.movePiece(fromQ, fromR, toQ, toR);
        
        // Add to move history
        this.moveHistory.push({
            from: { q: fromQ, r: fromR },
            to: { q: toQ, r: toR },
            piece: piece,
            captured: targetPiece,
            turn: this.currentTurn,
            hadMoved: piece.hasMoved
        });
        
        // Clear selection
        const fromHex = this.board.getHexAt(fromQ, fromR);
        fromHex.classList.remove('selected');
        this.board.selectedHex = null;
        
        // Switch turns
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
        
        // Check for checkmate or stalemate
        if (this.validator.isCheckmate(this.currentTurn)) {
            this.gameStatus = `${this.currentTurn === 'white' ? 'Black' : 'White'} wins by checkmate`;
        } else if (this.validator.isStalemate(this.currentTurn)) {
            this.gameStatus = 'Stalemate';
        } else if (this.validator.isInCheck(this.currentTurn)) {
            this.gameStatus = `${this.currentTurn} is in check`;
        } else {
            this.gameStatus = 'active';
        }
        
        // Update UI
        this.updateUI();
        
        // Sync with Firebase if online
        if (this.isOnline && this.firebase) {
            const move = {
                from: { q: fromQ, r: fromR },
                to: { q: toQ, r: toR },
                piece: piece,
                captured: targetPiece,
                turn: this.currentTurn === 'white' ? 'black' : 'white'
            };
            this.syncMove(move);
        }
    }
    
    updateUI() {
        document.getElementById('current-turn').textContent = 
            this.currentTurn.charAt(0).toUpperCase() + this.currentTurn.slice(1);
        document.getElementById('game-status').textContent = 
            this.gameStatus.charAt(0).toUpperCase() + this.gameStatus.slice(1);
        
        // Update move history
        const movesList = document.getElementById('moves-list');
        movesList.innerHTML = '';
        this.moveHistory.forEach((move, index) => {
            const moveElement = document.createElement('div');
            moveElement.className = 'move';
            moveElement.textContent = `${index + 1}. ${move.piece.type} ${move.from.q},${move.from.r} → ${move.to.q},${move.to.r}`;
            movesList.appendChild(moveElement);
        });
        
        // Update captured pieces
        this.updateCapturedPieces();
    }
    
    updateCapturedPieces() {
        const capturedWhite = document.getElementById('captured-white');
        const capturedBlack = document.getElementById('captured-black');
        
        capturedWhite.innerHTML = '';
        capturedBlack.innerHTML = '';
        
        this.capturedPieces.white.forEach(piece => {
            const pieceElement = piece.createElement();
            capturedWhite.appendChild(pieceElement);
        });
        
        this.capturedPieces.black.forEach(piece => {
            const pieceElement = piece.createElement();
            capturedBlack.appendChild(pieceElement);
        });
    }
    
    newGame() {
        this.currentTurn = 'white';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameStatus = 'active';
        
        // Reset board and pieces
        this.board = new HexBoard('hex-board');
        this.pieceManager = new PieceManager(this.board);
        this.board.onHexClick = (q, r) => this.handleHexClick(q, r);
        
        this.updateUI();
    }
    
    undoMove() {
        if (this.moveHistory.length === 0) return;
        
        const lastMove = this.moveHistory.pop();
        
        // Move piece back
        this.pieceManager.movePiece(
            lastMove.to.q, lastMove.to.r,
            lastMove.from.q, lastMove.from.r
        );
        
        // Restore original hasMoved state
        const piece = this.pieceManager.getPieceAt(lastMove.from.q, lastMove.from.r);
        if (piece) {
            piece.hasMoved = lastMove.hadMoved;
        }
        
        // Restore captured piece if any
        if (lastMove.captured) {
            this.capturedPieces[lastMove.captured.color].pop();
            this.pieceManager.addPiece(lastMove.captured);
        }
        
        // Switch turn back
        this.currentTurn = lastMove.turn;
        
        this.updateUI();
    }
    
    resign() {
        this.gameStatus = `${this.currentTurn === 'white' ? 'Black' : 'White'} wins by resignation`;
        this.updateUI();
        
        if (this.isOnline && this.firebase) {
            this.firebase.leaveGame();
        }
    }
    
    async createOnlineGame() {
        if (!this.firebase) return;
        
        try {
            const gameId = await this.firebase.createGame();
            this.showGameId(gameId);
        } catch (error) {
            console.error('Failed to create game:', error);
            this.showError('Failed to create game');
        }
    }
    
    async joinOnlineGame() {
        if (!this.firebase) return;
        
        const gameId = prompt('Enter game ID:');
        if (!gameId) return;
        
        try {
            await this.firebase.joinGame(gameId);
            this.showSuccess('Joined game successfully');
        } catch (error) {
            console.error('Failed to join game:', error);
            this.showError('Failed to join game: ' + error.message);
        }
    }
    
    onRemoteUpdate(gameData) {
        // Update local game state with remote data
        this.currentTurn = gameData.currentTurn;
        this.gameStatus = gameData.gameStatus;
        this.moveHistory = gameData.moves || [];
        
        // Update board state
        this.deserializeBoard(gameData.board);
        
        this.updateUI();
    }
    
    syncMove(move) {
        if (!this.firebase) return;
        
        const moveData = {
            boardState: this.serializeBoard(),
            nextTurn: this.currentTurn,
            gameStatus: this.gameStatus,
            move: move
        };
        
        this.firebase.makeMove(moveData);
    }
    
    serializeBoard() {
        const pieces = [];
        this.pieceManager.getAllPieces().forEach(piece => {
            pieces.push({
                type: piece.type,
                color: piece.color,
                q: piece.q,
                r: piece.r,
                hasMoved: piece.hasMoved
            });
        });
        return pieces;
    }
    
    deserializeBoard(piecesData) {
        // Clear current board
        this.pieceManager.pieces.clear();
        
        // Remove all piece elements from board
        this.board.hexagons.forEach(hex => {
            const pieceElement = hex.querySelector('.piece');
            if (pieceElement) {
                pieceElement.remove();
            }
        });
        
        // Add pieces from data
        piecesData.forEach(pieceData => {
            const piece = new ChessPiece(
                pieceData.type,
                pieceData.color,
                pieceData.q,
                pieceData.r
            );
            piece.hasMoved = pieceData.hasMoved;
            this.pieceManager.addPiece(piece);
        });
    }
    
    showGameId(gameId) {
        const message = document.createElement('div');
        message.className = 'game-id-message';
        message.innerHTML = `
            <h3>Game Created!</h3>
            <p>Share this ID with your opponent:</p>
            <code>${gameId}</code>
            <button onclick="this.parentElement.remove()">Close</button>
        `;
        document.body.appendChild(message);
    }
    
    showError(message) {
        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = message;
        document.body.appendChild(error);
        
        setTimeout(() => error.remove(), 3000);
    }
    
    showSuccess(message) {
        const success = document.createElement('div');
        success.className = 'success-message';
        success.textContent = message;
        document.body.appendChild(success);
        
        setTimeout(() => success.remove(), 3000);
    }
}