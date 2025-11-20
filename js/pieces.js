class ChessPiece {
    constructor(type, color, q, r) {
        this.type = type;
        this.color = color;
        this.q = q;
        this.r = r;
        this.hasMoved = false;
    }
    
    getSymbol() {
        const symbols = {
            'white': {
                'king': '♔',
                'queen': '♕',
                'rook': '♖',
                'bishop': '♗',
                'knight': '♘',
                'pawn': '♙'
            },
            'black': {
                'king': '♚',
                'queen': '♛',
                'rook': '♜',
                'bishop': '♝',
                'knight': '♞',
                'pawn': '♟'
            }
        };
        return symbols[this.color][this.type];
    }
    
    createElement() {
        const pieceElement = document.createElement('div');
        pieceElement.className = `piece ${this.color} ${this.type}`;
        pieceElement.textContent = this.getSymbol();
        return pieceElement;
    }
}

class PieceManager {
    constructor(board) {
        this.board = board;
        this.pieces = new Map();
        this.setupInitialPosition();
    }
    
    setupInitialPosition() {
        // White pieces
        this.addPiece(new ChessPiece('rook', 'white', -5, 0));
        this.addPiece(new ChessPiece('knight', 'white', -4, -1));
        this.addPiece(new ChessPiece('bishop', 'white', -4, 0));
        this.addPiece(new ChessPiece('queen', 'white', -3, -2));
        this.addPiece(new ChessPiece('king', 'white', -3, -1));
        this.addPiece(new ChessPiece('bishop', 'white', -3, 0));
        this.addPiece(new ChessPiece('knight', 'white', -2, -3));
        this.addPiece(new ChessPiece('rook', 'white', -2, -2));
        
        // White pawns
        for (let q = -5; q <= 5; q++) {
            if (q !== 0) {
                this.addPiece(new ChessPiece('pawn', 'white', q, -4));
            }
        }
        this.addPiece(new ChessPiece('pawn', 'white', -1, -5));
        this.addPiece(new ChessPiece('pawn', 'white', 0, -5));
        this.addPiece(new ChessPiece('pawn', 'white', 1, -5));
        
        // Black pieces
        this.addPiece(new ChessPiece('rook', 'black', 5, 0));
        this.addPiece(new ChessPiece('knight', 'black', 4, 1));
        this.addPiece(new ChessPiece('bishop', 'black', 4, 0));
        this.addPiece(new ChessPiece('queen', 'black', 3, 2));
        this.addPiece(new ChessPiece('king', 'black', 3, 1));
        this.addPiece(new ChessPiece('bishop', 'black', 3, 0));
        this.addPiece(new ChessPiece('knight', 'black', 2, 3));
        this.addPiece(new ChessPiece('rook', 'black', 2, 2));
        
        // Black pawns
        for (let q = -5; q <= 5; q++) {
            if (q !== 0) {
                this.addPiece(new ChessPiece('pawn', 'black', q, 4));
            }
        }
        this.addPiece(new ChessPiece('pawn', 'black', -1, 5));
        this.addPiece(new ChessPiece('pawn', 'black', 0, 5));
        this.addPiece(new ChessPiece('pawn', 'black', 1, 5));
    }
    
    addPiece(piece) {
        const key = `${piece.q},${piece.r}`;
        this.pieces.set(key, piece);
        
        const hex = this.board.getHexAt(piece.q, piece.r);
        if (hex) {
            const pieceElement = piece.createElement();
            hex.appendChild(pieceElement);
        }
    }
    
    movePiece(fromQ, fromR, toQ, toR) {
        const fromKey = `${fromQ},${fromR}`;
        const toKey = `${toQ},${toR}`;
        
        const piece = this.pieces.get(fromKey);
        if (!piece) return false;
        
        // Remove piece from old position
        this.pieces.delete(fromKey);
        
        // Update piece position
        piece.q = toQ;
        piece.r = toR;
        piece.hasMoved = true;
        
        // Add piece to new position
        this.pieces.set(toKey, piece);
        
        // Update board display
        const fromHex = this.board.getHexAt(fromQ, fromR);
        const toHex = this.board.getHexAt(toQ, toR);
        
        if (fromHex && toHex) {
            const pieceElement = fromHex.querySelector('.piece');
            if (pieceElement) {
                toHex.appendChild(pieceElement);
            }
        }
        
        return true;
    }
    
    getPieceAt(q, r) {
        return this.pieces.get(`${q},${r}`);
    }
    
    getAllPieces() {
        return Array.from(this.pieces.values());
    }
    
    getPiecesByColor(color) {
        return this.getAllPieces().filter(piece => piece.color === color);
    }
}