class HexChessGame {
    constructor(boardId, isOnline = false) {
        console.log('🎮 HexChessGame constructor called', { boardId, isOnline });
        this.board = new HexBoard(boardId);
        this.pieceManager = new PieceManager(this.board);
        this.validator = new MoveValidator(this.pieceManager);
        this.currentTurn = 'white';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameStatus = 'active';
        this.isOnline = isOnline;
        
        if (isOnline) {
            console.log('🌐 Initializing online game with Firebase');
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
        console.log('🎯 Setting up event listeners');
        
        // Override board click handler to include game logic
        this.board.onHexClick = (q, r) => this.handleHexClick(q, r);
        
        // Control buttons
        const newGameBtn = document.getElementById('new-game');
        const undoMoveBtn = document.getElementById('undo-move');
        const resignBtn = document.getElementById('resign');
        
        if (newGameBtn) {
            console.log('🔘 Found New Game button, adding click listener');
            newGameBtn.addEventListener('click', () => {
                console.log('🆕 New Game button clicked!');
                this.newGame();
            });
        } else {
            console.warn('⚠️ New Game button not found');
        }
        
        if (undoMoveBtn) {
            console.log('🔘 Found Undo Move button, adding click listener');
            undoMoveBtn.addEventListener('click', () => {
                console.log('↩️ Undo Move button clicked!');
                this.undoMove();
            });
        } else {
            console.warn('⚠️ Undo Move button not found');
        }
        
        if (resignBtn) {
            console.log('🔘 Found Resign button, adding click listener');
            resignBtn.addEventListener('click', () => {
                console.log('🏳️ Resign button clicked!');
                this.resign();
            });
        } else {
            console.warn('⚠️ Resign button not found');
        }
        
        if (this.isOnline) {
            const createGameBtn = document.getElementById('create-game');
            const joinGameBtn = document.getElementById('join-game');
            
            if (createGameBtn) {
                console.log('🔘 Found Create Online Game button, adding click listener');
                createGameBtn.addEventListener('click', () => {
                    console.log('🌐 Create Online Game button clicked!');
                    this.createOnlineGame();
                });
            } else {
                console.warn('⚠️ Create Online Game button not found');
            }
            
            if (joinGameBtn) {
                console.log('🔘 Found Join Online Game button, adding click listener');
                joinGameBtn.addEventListener('click', () => {
                    console.log('🔗 Join Online Game button clicked!');
                    this.joinOnlineGame();
                });
            } else {
                console.warn('⚠️ Join Online Game button not found');
            }
        }
    }
    
    handleHexClick(q, r) {
        console.log(`🎯 Hex clicked at coordinates (${q}, ${r})`);
        const hexKey = `${q},${r}`;
        const hex = this.board.getHexAt(q, r);
        const piece = this.pieceManager.getPieceAt(q, r);
        
        console.log('📊 Hex click details:', {
            hexKey,
            hasPiece: !!piece,
            piece: piece ? `${piece.color} ${piece.type}` : 'none',
            currentTurn: this.currentTurn,
            selectedHex: this.board.selectedHex
        });
        
        if (this.board.selectedHex) {
            if (this.board.selectedHex === hexKey) {
                console.log('🔄 Deselecting current hex');
                hex.classList.remove('selected');
                this.board.selectedHex = null;
            } else {
                console.log(`🚀 Attempting move from ${this.board.selectedHex} to ${hexKey}`);
                this.attemptMove(this.board.selectedHex, hexKey);
            }
        } else if (piece && piece.color === this.currentTurn) {
            console.log(`✅ Selecting ${piece.color} ${piece.type} at (${q}, ${r})`);
            hex.classList.add('selected');
            this.board.selectedHex = hexKey;
        } else {
            console.log('❌ Cannot select - no piece or wrong turn');
        }
    }
    
    attemptMove(fromKey, toKey) {
        console.log(`🎲 Attempting move: ${fromKey} → ${toKey}`);
        const [fromQ, fromR] = fromKey.split(',').map(Number);
        const [toQ, toR] = toKey.split(',').map(Number);
        
        const piece = this.pieceManager.getPieceAt(fromQ, fromR);
        const targetPiece = this.pieceManager.getPieceAt(toQ, toR);
        
        console.log('📋 Move validation details:', {
            piece: piece ? `${piece.color} ${piece.type}` : 'none',
            targetPiece: targetPiece ? `${targetPiece.color} ${targetPiece.type}` : 'none',
            currentTurn: this.currentTurn,
            fromCoords: { q: fromQ, r: fromR },
            toCoords: { q: toQ, r: toR }
        });
        
        if (!piece || piece.color !== this.currentTurn) {
            console.log('❌ Move invalid: No piece or wrong turn');
            return false;
        }
        
        if (targetPiece && targetPiece.color === piece.color) {
            console.log('❌ Move invalid: Cannot capture own piece');
            return false;
        }
        
        if (this.isValidMove(piece, fromQ, fromR, toQ, toR)) {
            console.log('✅ Move valid, executing...');
            this.makeMove(fromQ, fromR, toQ, toR);
            return true;
        }
        
        console.log('❌ Move invalid: Failed validation');
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
        
        console.log('🎯 Executing move:', {
            piece: `${piece.color} ${piece.type}`,
            from: `${fromQ},${fromR}`,
            to: `${toQ},${toR}`,
            targetPiece: targetPiece ? `${targetPiece.color} ${targetPiece.type}` : 'none'
        });
        
        // Capture piece if present
        if (targetPiece) {
            this.capturedPieces[targetPiece.color].push(targetPiece);
            console.log(`💰 Captured: ${targetPiece.color} ${targetPiece.type}`);
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
        
        console.log(`📝 Move added to history. Total moves: ${this.moveHistory.length}`);
        
        // Clear selection
        const fromHex = this.board.getHexAt(fromQ, fromR);
        fromHex.classList.remove('selected');
        this.board.selectedHex = null;
        
        // Switch turns
        const previousTurn = this.currentTurn;
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
        console.log(`🔄 Turn switched: ${previousTurn} → ${this.currentTurn}`);
        
        // Check for checkmate or stalemate
        if (this.validator.isCheckmate(this.currentTurn)) {
            this.gameStatus = `${this.currentTurn === 'white' ? 'Black' : 'White'} wins by checkmate`;
            console.log(`♟️ CHECKMATE! ${this.gameStatus}`);
        } else if (this.validator.isStalemate(this.currentTurn)) {
            this.gameStatus = 'Stalemate';
            console.log(`🤝 STALEMATE! Game is drawn`);
        } else if (this.validator.isInCheck(this.currentTurn)) {
            this.gameStatus = `${this.currentTurn} is in check`;
            console.log(`⚠️ CHECK! ${this.currentTurn} is in check`);
        } else {
            this.gameStatus = 'active';
            console.log(`✅ Game continues normally`);
        }
        
        // Update UI
        this.updateUI();
        
        // Sync with Firebase if online
        if (this.isOnline && this.firebase) {
            console.log('🌐 Syncing move with Firebase...');
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
        console.log('🆕 Starting new game - resetting all state');
        this.currentTurn = 'white';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameStatus = 'active';
        
        console.log('🔄 Resetting board and pieces');
        // Reset board and pieces
        this.board = new HexBoard('hex-board');
        this.pieceManager = new PieceManager(this.board);
        this.board.onHexClick = (q, r) => this.handleHexClick(q, r);
        
        console.log('🎮 New game initialized, updating UI');
        this.updateUI();
    }
    
    undoMove() {
        console.log('↩️ Undo move requested');
        if (this.moveHistory.length === 0) {
            console.log('❌ No moves to undo');
            return;
        }
        
        const lastMove = this.moveHistory.pop();
        console.log('📋 Undoing last move:', {
            piece: `${lastMove.piece.color} ${lastMove.piece.type}`,
            from: `${lastMove.from.q},${lastMove.from.r}`,
            to: `${lastMove.to.q},${lastMove.to.r}`,
            captured: lastMove.captured ? `${lastMove.captured.color} ${lastMove.captured.type}` : 'none'
        });
        
        // Move piece back
        this.pieceManager.movePiece(
            lastMove.to.q, lastMove.to.r,
            lastMove.from.q, lastMove.from.r
        );
        
        // Restore original hasMoved state
        const piece = this.pieceManager.getPieceAt(lastMove.from.q, lastMove.from.r);
        if (piece) {
            piece.hasMoved = lastMove.hadMoved;
            console.log(`🔄 Restored hasMoved state for ${piece.color} ${piece.type}: ${piece.hasMoved}`);
        }
        
        // Restore captured piece if any
        if (lastMove.captured) {
            this.capturedPieces[lastMove.captured.color].pop();
            this.pieceManager.addPiece(lastMove.captured);
            console.log(`♻️ Restored captured piece: ${lastMove.captured.color} ${lastMove.captured.type}`);
        }
        
        // Switch turn back
        this.currentTurn = lastMove.turn;
        console.log(`🔄 Turn switched back to: ${this.currentTurn}`);
        
        this.updateUI();
    }
    
    resign() {
        console.log(`🏳️ ${this.currentTurn} player resigning from game`);
        this.gameStatus = `${this.currentTurn === 'white' ? 'Black' : 'White'} wins by resignation`;
        console.log(`🏆 Game status updated: ${this.gameStatus}`);
        this.updateUI();
        
        if (this.isOnline && this.firebase) {
            console.log('🌐 Leaving online game due to resignation');
            this.firebase.leaveGame();
        }
    }
    
    async createOnlineGame() {
        console.log('🌐 Create online game button clicked');
        if (!this.firebase) {
            console.log('❌ Firebase not available');
            this.showError('Firebase not available');
            return;
        }
        
        try {
            console.log('🎲 Creating new online game...');
            const gameId = await this.firebase.createGame();
            console.log(`✅ Online game created with ID: ${gameId}`);
            this.showGameId(gameId);
        } catch (error) {
            console.error('❌ Failed to create game:', error);
            this.showError('Failed to create game');
        }
    }
    
    async joinOnlineGame() {
        console.log('🔗 Join online game button clicked');
        if (!this.firebase) {
            console.log('❌ Firebase not available');
            this.showError('Firebase not available');
            return;
        }
        
        const gameId = prompt('Enter game ID:');
        if (!gameId) {
            console.log('❌ No game ID entered');
            return;
        }
        
        console.log(`🎯 Attempting to join game: ${gameId}`);
        try {
            await this.firebase.joinGame(gameId);
            console.log('✅ Successfully joined online game');
            this.showSuccess('Joined game successfully');
        } catch (error) {
            console.error('❌ Failed to join game:', error);
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