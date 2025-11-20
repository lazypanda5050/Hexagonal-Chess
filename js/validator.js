class MoveValidator {
    constructor(pieceManager) {
        this.pieceManager = pieceManager;
    }
    
    isPathClear(fromQ, fromR, toQ, toR) {
        const dq = toQ - fromQ;
        const dr = toR - fromR;
        
        const steps = Math.max(Math.abs(dq), Math.abs(dr));
        if (steps === 0) return true;
        
        const stepQ = dq / steps;
        const stepR = dr / steps;
        
        for (let i = 1; i < steps; i++) {
            const checkQ = fromQ + stepQ * i;
            const checkR = fromR + stepR * i;
            
            if (this.pieceManager.getPieceAt(Math.round(checkQ), Math.round(checkR))) {
                return false;
            }
        }
        
        return true;
    }
    
    isInCheck(color) {
        // Find the king
        const king = this.pieceManager.getAllPieces().find(p => 
            p.type === 'king' && p.color === color
        );
        
        if (!king) return false;
        
        // Check if any opponent piece can attack the king
        const opponentPieces = this.pieceManager.getPiecesByColor(color === 'white' ? 'black' : 'white');
        
        return opponentPieces.some(piece => 
            this.canPieceAttack(piece, piece.q, piece.r, king.q, king.r)
        );
    }
    
    wouldBeInCheck(fromQ, fromR, toQ, toR, color) {
        // Simulate the move
        const piece = this.pieceManager.getPieceAt(fromQ, fromR);
        const targetPiece = this.pieceManager.getPieceAt(toQ, toR);
        
        // Temporarily make the move
        this.pieceManager.movePiece(fromQ, fromR, toQ, toR);
        
        const inCheck = this.isInCheck(color);
        
        // Undo the move
        this.pieceManager.movePiece(toQ, toR, fromQ, fromR);
        if (targetPiece) {
            this.pieceManager.addPiece(targetPiece);
        }
        
        return inCheck;
    }
    
    canPieceAttack(piece, fromQ, fromR, toQ, toR) {
        const dq = toQ - fromQ;
        const dr = toR - fromR;
        
        switch (piece.type) {
            case 'pawn':
                const direction = piece.color === 'white' ? 1 : -1;
                return dr === direction && (dq === 1 || dq === -1);
            case 'rook':
                return this.isValidRookMove(dq, dr) && this.isPathClear(fromQ, fromR, toQ, toR);
            case 'knight':
                return this.isValidKnightMove(dq, dr);
            case 'bishop':
                return this.isValidBishopMove(dq, dr) && this.isPathClear(fromQ, fromR, toQ, toR);
            case 'queen':
                return this.isValidQueenMove(dq, dr) && this.isPathClear(fromQ, fromR, toQ, toR);
            case 'king':
                return this.isValidKingMove(dq, dr);
            default:
                return false;
        }
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
    
    isCheckmate(color) {
        if (!this.isInCheck(color)) return false;
        
        const pieces = this.pieceManager.getPiecesByColor(color);
        
        // Check if any piece can make a legal move
        return !pieces.some(piece => {
            const possibleMoves = this.getPossibleMoves(piece);
            return possibleMoves.some(([toQ, toR]) => 
                !this.wouldBeInCheck(piece.q, piece.r, toQ, toR, color)
            );
        });
    }
    
    isStalemate(color) {
        if (this.isInCheck(color)) return false;
        
        const pieces = this.pieceManager.getPiecesByColor(color);
        
        // Check if any piece can make a legal move
        return !pieces.some(piece => {
            const possibleMoves = this.getPossibleMoves(piece);
            return possibleMoves.some(([toQ, toR]) => 
                !this.wouldBeInCheck(piece.q, piece.r, toQ, toR, color)
            );
        });
    }
    
    getPossibleMoves(piece) {
        const moves = [];
        const maxRange = 11; // Board size limit
        
        for (let dq = -maxRange; dq <= maxRange; dq++) {
            for (let dr = -maxRange; dr <= maxRange; dr++) {
                const toQ = piece.q + dq;
                const toR = piece.r + dr;
                
                // Skip if same position
                if (dq === 0 && dr === 0) continue;
                
                // Check if move is valid for this piece type
                if (this.canPieceAttack(piece, piece.q, piece.r, toQ, toR)) {
                    const targetPiece = this.pieceManager.getPieceAt(toQ, toR);
                    
                    // Can't capture own piece
                    if (targetPiece && targetPiece.color === piece.color) continue;
                    
                    moves.push([toQ, toR]);
                }
            }
        }
        
        return moves;
    }
}