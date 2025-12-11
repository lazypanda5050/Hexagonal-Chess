(() => {
    const BOARD_RADIUS = 5; // Creates 91 tiles for Gliński's board
    const SQRT3 = Math.sqrt(3);

    const appRoot = document.getElementById('app');
    if (!appRoot) {
        return;
    }

    const rootStyles = getComputedStyle(document.documentElement);
    const hexSize = Number.parseFloat(rootStyles.getPropertyValue('--hex-size')) || 46;
    const padding = hexSize * 1.25;
    const HEX_WIDTH = hexSize * 2;
    const HEX_HEIGHT = hexSize * SQRT3;
    const pieceSize = hexSize * 1.2;

    const tilePositions = new Map();
    const tileElements = new Map();
    const piecesById = new Map();
    const boardOccupancy = new Map();
    const pawnStartingSquares = {
        white: new Set(),
        black: new Set()
    };
    let isBoardFlipped = false;
    let pendingFlipTimeoutId = null;
    let currentTurn = 'white';
    let pieceIdCounter = 0;
    let selectedPieceId = null;
    let availableMoves = [];
    const highlightedTiles = [];
    const lastMoveTiles = [];
    const moveHistory = [];
    let currentMoveNumber = 1;
    let pendingPromotion = null;

    const PIECE_SPRITES = {
        white: {
            king: 'assets/pieces/white-king.svg',
            queen: 'assets/pieces/white-queen.svg',
            rook: 'assets/pieces/white-rook.svg',
            bishop: 'assets/pieces/white-bishop.svg',
            knight: 'assets/pieces/white-knight.svg',
            pawn: 'assets/pieces/white-pawn.svg'
        },
        black: {
            king: 'assets/pieces/black-king.svg',
            queen: 'assets/pieces/black-queen.svg',
            rook: 'assets/pieces/black-rook.svg',
            bishop: 'assets/pieces/black-bishop.svg',
            knight: 'assets/pieces/black-knight.svg',
            pawn: 'assets/pieces/black-pawn.svg'
        }
    };

    const STARTING_GROUPS = [
        {
            type: 'rook',
            coords: [
                { q: -3, r: 5 },
                { q: 3, r: 2 }
            ]
        },
        {
            type: 'knight',
            coords: [
                { q: -2, r: 5 },
                { q: 2, r: 3 }
            ]
        },
        {
            type: 'bishop',
            coords: [
                { q: 0, r: 3 },
                { q: 0, r: 4 },
                { q: 0, r: 5 }
            ]
        },
        {
            type: 'queen',
            coords: [{ q: -1, r: 5 }]
        },
        {
            type: 'king',
            coords: [{ q: 1, r: 4 }]
        },
        {
            type: 'pawn',
            coords: [
                { q: -4, r: 5 },
                { q: -3, r: 4 },
                { q: -2, r: 3 },
                { q: -1, r: 2 },
                { q: 0, r: 2 },
                { q: 1, r: 1 },
                { q: 2, r: 1 },
                { q: 3, r: 1 },
                { q: 4, r: 1 }
            ]
        }
    ];

    const BISHOP_DIRECTIONS = [
        { q: 1, r: 1 },
        { q: -1, r: -1 },
        { q: 2, r: -1 },
        { q: -2, r: 1 },
        { q: 1, r: -2 },
        { q: -1, r: 2 }
    ];
    const STRAIGHT_DIRECTIONS = [
        { q: 1, r: 0 },
        { q: 0, r: 1 },
        { q: -1, r: 1 },
        { q: -1, r: 0 },
        { q: 0, r: -1 },
        { q: 1, r: -1 }
    ];
    const KNIGHT_OFFSETS = buildKnightOffsets();

    const board = document.createElement('div');
    board.id = 'board';

    const tiles = buildTiles();
    sizeBoard(tiles);
    renderTiles(tiles);
    renderLabels(tiles);

    const boardContainer = document.createElement('div');
    boardContainer.id = 'board-container';
    boardContainer.appendChild(board);

    const layout = document.createElement('div');
    layout.id = 'game-layout';
    const controls = buildGameControls();
    const historySidebar = buildHistorySidebar();
    const promotionModal = buildPromotionModal();
    layout.appendChild(boardContainer);
    layout.appendChild(controls);
    layout.appendChild(historySidebar);

    appRoot.appendChild(layout);
    appRoot.appendChild(promotionModal);

    initEmptyBoard();

    function buildTiles() {
        const result = [];
        for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q += 1) {
            for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r += 1) {
                const s = -q - r;
                if (Math.abs(s) > BOARD_RADIUS) {
                    continue;
                }
                const { x, y } = axialToPixel(q, r);
                result.push({ q, r, x, y });
            }
        }
        return result;
    }

    function sizeBoard(tilesArray) {
        const xs = tilesArray.map(tile => tile.x);
        const ys = tilesArray.map(tile => tile.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const width = maxX - minX + hexSize * 2 + padding;
        const height = maxY - minY + SQRT3 * hexSize + padding;
        board.style.width = `${width}px`;
        board.style.height = `${height}px`;
    }

    function renderTiles(tilesArray) {
        const minX = Math.min(...tilesArray.map(tile => tile.x));
        const minY = Math.min(...tilesArray.map(tile => tile.y));
        tilesArray.forEach(tile => {
            const tileElement = document.createElement('div');
            tileElement.className = `hex-tile color-${colorIndex(tile.q, tile.r)}`;
            const offsetX = tile.x - minX + padding / 2;
            const offsetY = tile.y - minY + padding / 2;
            tileElement.style.left = `${offsetX}px`;
            tileElement.style.top = `${offsetY}px`;
            tileElement.dataset.q = tile.q;
            tileElement.dataset.r = tile.r;
            tileElement.addEventListener('click', () => {
                handleTileClick(tile.q, tile.r);
            });
            tilePositions.set(coordKey(tile.q, tile.r), {
                left: offsetX,
                top: offsetY,
                centerX: offsetX + HEX_WIDTH / 2,
                centerY: offsetY + HEX_HEIGHT / 2
            });
            tileElements.set(coordKey(tile.q, tile.r), tileElement);
            board.appendChild(tileElement);
        });
    }

    function renderPieces(pieces) {
        pieces.forEach(piece => {
            const position = tilePositions.get(coordKey(piece.q, piece.r));
            if (!position) {
                return;
            }
            const pieceElement = document.createElement('img');
            pieceElement.className = `piece piece-${piece.color}`;
            pieceElement.src = PIECE_SPRITES[piece.color][piece.type];
            pieceElement.alt = `${piece.color} ${piece.type}`;
            pieceElement.width = pieceSize;
            pieceElement.height = pieceSize;
            pieceElement.style.left = `${position.centerX - pieceSize / 2}px`;
            pieceElement.style.top = `${position.centerY - pieceSize / 2}px`;
            piece.element = pieceElement;
            pieceElement.dataset.pieceId = piece.id;
            board.appendChild(pieceElement);
        });
    }

    function initEmptyBoard() {
        clearSelection();
        clearLastMoveHighlight();
        board.querySelectorAll('.piece').forEach(pieceElement => {
            pieceElement.parentNode.removeChild(pieceElement);
        });
        piecesById.clear();
        boardOccupancy.clear();
        pieceIdCounter = 0;
    }

    function resetBoard() {
        initEmptyBoard();
        const freshPieces = createInitialPieces();
        placePieces(freshPieces);
    }

    function createInitialPieces() {
        const basePieces = buildInitialPieces().map(piece => ({
            ...piece,
            id: `piece-${pieceIdCounter++}`,
            hasMoved: false,
            initialQ: piece.q,
            initialR: piece.r,
            element: null,
            isCaptured: false
        }));
        return basePieces;
    }

    function placePieces(pieces) {
        pieces.forEach(piece => {
            piecesById.set(piece.id, piece);
            boardOccupancy.set(coordKey(piece.q, piece.r), piece.id);
        });
        renderPieces(pieces);
    
    }

    function handleTileClick(q, r) {
        const move = availableMoves.find(
            entry =>
                (entry.q === q && entry.r === r) ||
                (entry.triggerQ === q && entry.triggerR === r)
        );
        if (move && selectedPieceId) {
            moveSelectedPieceTo(move);
            return;
        }
        const key = coordKey(q, r);
        const occupantId = boardOccupancy.get(key);
        if (!occupantId) {
            clearSelection();
            return;
        }
        const piece = piecesById.get(occupantId);
        if (!piece || piece.isCaptured) {
            clearSelection();
            return;
        }
        if (piece.color !== currentTurn) {
            clearSelection();
            return;
        }
        const moves = getMovesForPiece(piece);
        if (moves.length === 0) {
            clearSelection();
            return;
        }
        if (selectedPieceId === piece.id) {
            clearSelection();
            return;
        }
        selectPiece(piece, moves);
    }

    function selectPiece(piece, precomputedMoves) {
        selectedPieceId = piece.id;
        availableMoves = precomputedMoves ?? getMovesForPiece(piece);
        highlightSelection(piece, availableMoves);
    }

    function clearSelection() {
        selectedPieceId = null;
        availableMoves = [];
        clearHighlightedTiles();
    }

    function highlightSelection(piece, moves) {
        clearHighlightedTiles();
        highlightTile(piece.q, piece.r, 'tile-selected');
        moves.forEach(move => {
            let className;
            const targetQ = move.triggerQ ?? move.q;
            const targetR = move.triggerR ?? move.r;

            if (move.captureId) {
                className = 'tile-capture';
            } else {
                const targetKey = coordKey(targetQ, targetR);
                const occupantId = boardOccupancy.get(targetKey);
                className = occupantId ? 'tile-move-friendly' : 'tile-move';
            }
            highlightTile(targetQ, targetR, className);
        });
    }

    function highlightTile(q, r, className) {
        const tileElement = tileElements.get(coordKey(q, r));
        if (!tileElement) {
            return;
        }
        tileElement.classList.add(className);
        if (!highlightedTiles.includes(tileElement)) {
            highlightedTiles.push(tileElement);
        }
    }

    function clearHighlightedTiles() {
        highlightedTiles.forEach(tileEl => {
            tileEl.classList.remove('tile-selected', 'tile-move', 'tile-move-friendly', 'tile-capture');
        });
        highlightedTiles.length = 0;
    }

    function getMovesForPiece(piece) {
        switch (piece.type) {
            case 'pawn':
                return getPawnMoves(piece);
            case 'rook':
                return getRookMoves(piece);
            case 'queen':
                return getQueenMoves(piece);
            case 'king':
                return getKingMoves(piece);
            case 'bishop':
                return getBishopMoves(piece);
            case 'knight':
                return getKnightMoves(piece);
            default:
                return [];
        }
    }

    function getPawnMoves(piece) {
        const moves = [];
        const currentKey = coordKey(piece.q, piece.r);
        const onStartingSquare = pawnStartingSquares[piece.color].has(currentKey);
        const forwardDir = piece.color === 'white' ? { q: 0, r: -1 } : { q: 0, r: 1 };
        const diagonalDirs =
            piece.color === 'white'
                ? [
                      { q: 1, r: -1 },
                      { q: -1, r: 0 }
                  ]
                : [
                      { q: 1, r: 0 },
                      { q: -1, r: 1 }
                  ];

        const oneForward = { q: piece.q + forwardDir.q, r: piece.r + forwardDir.r };
        const oneForwardKey = coordKey(oneForward.q, oneForward.r);

        if (tilePositions.has(oneForwardKey) && !boardOccupancy.has(oneForwardKey)) {
            moves.push({ ...oneForward });
            if (onStartingSquare && !isCenterPawnSquare(piece)) {
                const twoForward = {
                    q: oneForward.q + forwardDir.q,
                    r: oneForward.r + forwardDir.r
                };
                const twoForwardKey = coordKey(twoForward.q, twoForward.r);
                if (tilePositions.has(twoForwardKey) && !boardOccupancy.has(twoForwardKey)) {
                    moves.push({ ...twoForward });
                }
            }
        }

        diagonalDirs.forEach(dir => {
            const target = { q: piece.q + dir.q, r: piece.r + dir.r };
            const targetKey = coordKey(target.q, target.r);
            if (!tilePositions.has(targetKey)) {
                return;
            }
            const occupantId = boardOccupancy.get(targetKey);
            if (!occupantId) {
                return;
            }
            const occupant = piecesById.get(occupantId);
            if (occupant && occupant.color !== piece.color && !occupant.isCaptured) {
                moves.push({ ...target, captureId: occupantId });
            }
        });

        return moves;
    }

    function getRookMoves(piece) {
        const moves = [];
        STRAIGHT_DIRECTIONS.forEach(dir => {
            let q = piece.q + dir.q;
            let r = piece.r + dir.r;
            while (tilePositions.has(coordKey(q, r))) {
                const key = coordKey(q, r);
                const occupantId = boardOccupancy.get(key);
                if (!occupantId) {
                    moves.push({ q, r });
                } else {
                    const occupant = piecesById.get(occupantId);
                    if (occupant && occupant.color !== piece.color && !occupant.isCaptured) {
                        moves.push({ q, r, captureId: occupantId });
                    }
                    break;
                }
                q += dir.q;
                r += dir.r;
            }
        });

        return moves;
    }

    function getQueenMoves(piece) {
        const moves = [];
        // Queen moves are the union of rook (straight) and bishop (diagonal) directions.
        const directions = [...STRAIGHT_DIRECTIONS, ...BISHOP_DIRECTIONS];

        directions.forEach(dir => {
            for (let i = 1; i <= BOARD_RADIUS; i += 1) {
                const target = {
                    q: piece.q + dir.q * i,
                    r: piece.r + dir.r * i
                };
                const targetKey = coordKey(target.q, target.r);

                if (!tilePositions.has(targetKey)) {
                    break;
                }

                const occupantId = boardOccupancy.get(targetKey);
                if (!occupantId) {
                    moves.push({ ...target });
                } else {
                    const occupant = piecesById.get(occupantId);
                    if (occupant && occupant.color !== piece.color && !occupant.isCaptured) {
                        moves.push({ ...target, captureId: occupantId });
                    }
                    break;
                }
            }
        });

        return moves;
    }

    function getKingMoves(piece) {
        const moves = [];
        const directions = [
            { q: 1, r: 0 },   // straight directions
            { q: -1, r: 0 },
            { q: 0, r: 1 },
            { q: 0, r: -1 },
            { q: 1, r: -1 },
            { q: -1, r: 1 },
            { q: 2, r: -1 },  // diagonal directions
            { q: -2, r: 1 },
            { q: 1, r: 1 },
            { q: -1, r: -1 },
            { q: 1, r: -2 },
            { q: -1, r: 2 }
        ];

        directions.forEach(dir => {
            const target = {
                q: piece.q + dir.q,
                r: piece.r + dir.r
            };
            const targetKey = coordKey(target.q, target.r);

            if (!tilePositions.has(targetKey)) {
                return;
            }

            const occupantId = boardOccupancy.get(targetKey);
            if (!occupantId) {
                moves.push({ ...target });
            } else {
                const occupant = piecesById.get(occupantId);
                if (occupant && occupant.color !== piece.color && !occupant.isCaptured) {
                    moves.push({ ...target, captureId: occupantId });
                }
            }
        });

        // Castling: kingside and queenside, with explicit per-color coordinates.
        // Kingside (already implemented before):
        //   White: if H3 is empty, move king to I4 and rook from I4 to H3.
        //   Black: if H11 is empty, move king to I11 and rook from I11 to H11.
        // Queenside:
        //   White: no pieces on F1, E1, D1; move king to D1, rook from C1 to E1.
        //   Black: no pieces on F11, E10, D9; move king to D9, rook from C11 to E10.
        if (!piece.hasMoved && !piece.isCaptured) {
            const isWhite = piece.color === 'white';

            // Kingside castling
            {
                const kingStart = isWhite ? { q: 1, r: 4 } : { q: 1, r: -5 };
                const rookStart = isWhite ? { q: 3, r: 2 } : { q: 3, r: -5 };
                const throughSquare = isWhite ? { q: 2, r: 3 } : { q: 2, r: -5 }; // H3 / H11
                const kingDestination = rookStart; // I4 / I11
                const rookDestination = throughSquare; // H3 / H11

                // King must be on its original kingside-castling square
                if (piece.q === kingStart.q && piece.r === kingStart.r) {
                    const throughKey = coordKey(throughSquare.q, throughSquare.r);
                    const rookStartKey = coordKey(rookStart.q, rookStart.r);

                    // H3 / H11 must be empty
                    if (tilePositions.has(throughKey) && !boardOccupancy.has(throughKey)) {
                        const rookId = boardOccupancy.get(rookStartKey);
                        const rook = rookId ? piecesById.get(rookId) : null;

                        if (
                            rook?.type === 'rook' &&
                            rook.color === piece.color &&
                            !rook.isCaptured &&
                            !rook.hasMoved
                        ) {
                            moves.push({
                                q: kingDestination.q,
                                r: kingDestination.r,
                                castle: {
                                    type: 'kingside',
                                    rookId: rook.id,
                                    rookToQ: rookDestination.q,
                                    rookToR: rookDestination.r
                                }
                            });
                        }
                    }
                }
            }

            // Queenside castling
            {
                const kingStart = isWhite ? { q: 1, r: 4 } : { q: 1, r: -5 };

                // King must be on its original starting square
                if (piece.q === kingStart.q && piece.r === kingStart.r) {
                    // Explicit starting squares for queenside pieces, in axial coordinates.
                    const queenSideRookStart = isWhite ? { q: -3, r: 5 } : { q: -3, r: -2 }; // C1 / C11
                    const queenSideKnightStart = isWhite ? { q: -2, r: 5 } : { q: -2, r: -3 }; // D1 / D9
                    const queenStart = isWhite ? { q: -1, r: 5 } : { q: -1, r: -4 }; // E1 / E10
                    const bishopStart = isWhite ? { q: 0, r: 5 } : { q: 0, r: -5 }; // F1 / F11

                    // All three intermediary squares (F-file bishop, E-file queen, D-file knight)
                    // must currently be empty to allow queenside castling.
                    const blockingSquaresEmpty = [bishopStart, queenStart, queenSideKnightStart].every(
                        square => {
                            const key = coordKey(square.q, square.r);
                            return tilePositions.has(key) && !boardOccupancy.has(key);
                        }
                    );

                    if (blockingSquaresEmpty) {
                        const rookStartKey = coordKey(queenSideRookStart.q, queenSideRookStart.r);
                        const rookId = boardOccupancy.get(rookStartKey);
                        const rook = rookId ? piecesById.get(rookId) : null;

                        if (
                            rook &&
                            rook.type === 'rook' &&
                            rook.color === piece.color &&
                            !rook.isCaptured &&
                            !rook.hasMoved
                        ) {
                            const kingDestinationQ = queenSideKnightStart.q;
                            const kingDestinationR = queenSideKnightStart.r;
                            const rookDestinationQ = queenStart.q;
                            const rookDestinationR = queenStart.r;

                            moves.push({
                                q: kingDestinationQ,
                                r: kingDestinationR,
                                triggerQ: queenSideRookStart.q,
                                triggerR: queenSideRookStart.r,
                                castle: {
                                    type: 'queenside',
                                    rookId: rook.id,
                                    rookToQ: rookDestinationQ,
                                    rookToR: rookDestinationR
                                }
                            });
                        }
                    }
                }
            }
        }

        return moves;
    }

    function getBishopMoves(piece) {
        const moves = [];
        BISHOP_DIRECTIONS.forEach(direction => {
            let q = piece.q + direction.q;
            let r = piece.r + direction.r;
            while (tilePositions.has(coordKey(q, r))) {
                const key = coordKey(q, r);
                const occupantId = boardOccupancy.get(key);
                if (!occupantId) {
                    moves.push({ q, r });
                } else {
                    const occupant = piecesById.get(occupantId);
                    if (occupant && occupant.color !== piece.color && !occupant.isCaptured) {
                        moves.push({ q, r, captureId: occupantId });
                    }
                    break;
                }
                q += direction.q;
                r += direction.r;
            }
        });
        return moves;
    }

    function getKnightMoves(piece) {
        const moves = [];
        KNIGHT_OFFSETS.forEach(offset => {
            const target = { q: piece.q + offset.q, r: piece.r + offset.r };
            const key = coordKey(target.q, target.r);
            if (!tilePositions.has(key)) {
                return;
            }
            const occupantId = boardOccupancy.get(key);
            if (!occupantId) {
                moves.push(target);
                return;
            }
            const occupant = piecesById.get(occupantId);
            if (occupant && occupant.color !== piece.color && !occupant.isCaptured) {
                moves.push({ ...target, captureId: occupantId });
            }
        });
        return moves;
    }

    function findKingsideRook(king) {
        // Kingside rook initial positions
        const kingsideRookInitial = king.color === 'white'
            ? { q: 3, r: 2 }    // White kingside rook
            : { q: 3, r: -5 };  // Black kingside rook, mirrored across horizontal axis

        let candidate = null;
        piecesById.forEach(piece => {
            if (
                piece.type === 'rook' &&
                piece.color === king.color &&
                !piece.isCaptured &&
                !piece.hasMoved &&
                piece.initialQ === kingsideRookInitial.q &&
                piece.initialR === kingsideRookInitial.r
            ) {
                candidate = piece;
            }
        });
        return candidate;
    }

    function findLineDirection(fromQ, fromR, toQ, toR) {
        const candidates = [...STRAIGHT_DIRECTIONS, ...BISHOP_DIRECTIONS];
        for (const dir of candidates) {
            let q = fromQ;
            let r = fromR;
            for (let i = 0; i <= BOARD_RADIUS; i += 1) {
                q += dir.q;
                r += dir.r;
                if (q === toQ && r === toR) {
                    return dir;
                }
                if (!tilePositions.has(coordKey(q, r))) {
                    break;
                }
            }
        }
        return null;
    }

    function computeKingsideRookDestination(rookQ, rookR, kingColor) {
        const kingDestKey = coordKey(rookQ, rookR);
        const kingPosition = tilePositions.get(kingDestKey);
        if (!kingPosition) {
            return null;
        }

        let bestTile = null;

        if (kingColor === 'white') {
            // From white's perspective, the rook should end up to the RIGHT of the king.
            // On screen, that means a hex with strictly HIGHER centerX than the king's.
            let bestCenterX = Number.NEGATIVE_INFINITY;
            STRAIGHT_DIRECTIONS.forEach(dir => {
                const candidate = { q: rookQ + dir.q, r: rookR + dir.r };
                const candidateKey = coordKey(candidate.q, candidate.r);
                const position = tilePositions.get(candidateKey);
                if (!position) {
                    return;
                }
                if (position.centerX > kingPosition.centerX && position.centerX > bestCenterX) {
                    bestCenterX = position.centerX;
                    bestTile = candidate;
                }
            });
        } else {
            // From black's perspective (board flipped), the rook should end up to the LEFT of the king.
            // On screen after flipping, that corresponds to a hex with strictly LOWER centerX.
            let bestCenterX = Number.POSITIVE_INFINITY;
            STRAIGHT_DIRECTIONS.forEach(dir => {
                const candidate = { q: rookQ + dir.q, r: rookR + dir.r };
                const candidateKey = coordKey(candidate.q, candidate.r);
                const position = tilePositions.get(candidateKey);
                if (!position) {
                    return;
                }
                if (position.centerX < kingPosition.centerX && position.centerX < bestCenterX) {
                    bestCenterX = position.centerX;
                    bestTile = candidate;
                }
            });
        }

        return bestTile;
    }

    function isCenterPawnSquare(piece) {
        const key = coordKey(piece.q, piece.r);
        return (
            piece.type === 'pawn' &&
            ((piece.color === 'white' && key === coordKey(0, 2)) ||
                (piece.color === 'black' && key === coordKey(0, -2)))
        );
    }

    function isPawnPromotionSquare(piece, q, r) {
        if (piece.type !== 'pawn') return false;
        
        // Simple fix: just reverse the logic
        if (piece.color === 'white') {
            // White promotes on black's back rank (positive r values)
            return r >= 4;
        } else {
            // Black promotes on white's back rank (negative r values)
            return r <= -4;
        }
    }

    function moveSelectedPieceTo(move) {
        const piece = piecesById.get(selectedPieceId ?? '');
        if (!piece) {
            return;
        }
        const fromQ = piece.q;
        const fromR = piece.r;
        const fromKey = coordKey(piece.q, piece.r);
        boardOccupancy.delete(fromKey);

        const isCapture = !!move.captureId;
        if (isCapture) {
            capturePiece(move.captureId);
        }

        // Check for pawn promotion
        if (piece.type === 'pawn' && isPawnPromotionSquare(piece, move.q, move.r)) {
            pendingPromotion = {
                piece: piece,
                fromQ: fromQ,
                fromR: fromR,
                toQ: move.q,
                toR: move.r,
                isCapture: isCapture,
                castle: move.castle
            };
            showPromotionModal(piece.color);
            return;
        }

        completeMove(piece, fromQ, fromR, move, isCapture);
    }

    function completeMove(piece, fromQ, fromR, move, isCapture, promotionType = null) {
        if (move.castle) {
            const rook = piecesById.get(move.castle.rookId ?? '');
            if (rook && !rook.isCaptured) {
                const rookFromKey = coordKey(rook.q, rook.r);
                boardOccupancy.delete(rookFromKey);
                rook.q = move.castle.rookToQ;
                rook.r = move.castle.rookToR;
                rook.hasMoved = true;
                const rookDestinationKey = coordKey(rook.q, rook.r);
                boardOccupancy.set(rookDestinationKey, rook.id);
                updatePiecePosition(rook);
            }
        }

        // Handle promotion
        if (promotionType) {
            piece.type = promotionType;
            piece.element.src = PIECE_SPRITES[piece.color][promotionType];
            piece.element.alt = `${piece.color} ${promotionType}`;
        }

        piece.q = move.q;
        piece.r = move.r;
        piece.hasMoved = true;
        const destinationKey = coordKey(piece.q, piece.r);
        boardOccupancy.set(destinationKey, piece.id);
        updatePiecePosition(piece);
        
        const moveNotation = createMoveNotation(piece, fromQ, fromR, piece.q, piece.r, isCapture, move.castle, promotionType);
        addMoveToHistory(moveNotation, piece.color);
        
        highlightLastMove(fromQ, fromR, piece.q, piece.r);
        clearSelection();
        endTurn(piece);
    }

    function showPromotionModal(color) {
        const modal = document.getElementById('promotion-modal');
        const pieceButtons = modal.querySelectorAll('.promotion-piece img');
        
        pieceButtons.forEach(img => {
            const pieceType = img.parentElement.dataset.piece;
            img.src = PIECE_SPRITES[color][pieceType];
        });
        
        modal.style.display = 'block';
    }

    function hidePromotionModal() {
        const modal = document.getElementById('promotion-modal');
        modal.style.display = 'none';
    }

    function handlePromotionChoice(promotionType) {
        if (!pendingPromotion) return;
        
        const { piece, fromQ, fromR, toQ, toR, isCapture, castle } = pendingPromotion;
        
        hidePromotionModal();
        
        completeMove(piece, fromQ, fromR, { q: toQ, r: toR, castle: castle }, isCapture, promotionType);
        
        pendingPromotion = null;
    }

    function highlightLastMove(fromQ, fromR, toQ, toR) {
        clearLastMoveHighlight();
        const fromTile = tileElements.get(coordKey(fromQ, fromR));
        const toTile = tileElements.get(coordKey(toQ, toR));
        [fromTile, toTile].forEach(tileEl => {
            if (!tileEl) {
                return;
            }
            tileEl.classList.add('tile-last-move');
            lastMoveTiles.push(tileEl);
        });
    }

    function clearLastMoveHighlight() {
        lastMoveTiles.forEach(tileEl => {
            tileEl.classList.remove('tile-last-move');
        });
        lastMoveTiles.length = 0;
    }

    function capturePiece(targetId) {
        const target = piecesById.get(targetId);
        if (!target || target.isCaptured) {
            return;
        }
        const targetKey = coordKey(target.q, target.r);
        boardOccupancy.delete(targetKey);
        target.isCaptured = true;
        if (target.element?.parentNode) {
            target.element.parentNode.removeChild(target.element);
        }
    }

    function updatePiecePosition(piece) {
        if (!piece.element) {
            return;
        }
        const position = tilePositions.get(coordKey(piece.q, piece.r));
        if (!position) {
            return;
        }
        piece.element.style.left = `${position.centerX - pieceSize / 2}px`;
        piece.element.style.top = `${position.centerY - pieceSize / 2}px`;
    }

    function renderLabels(tilesArray) {
        const letterEntries = buildLetterLabelEntries(tilesArray);
        letterEntries.slice(0, 11).forEach((entry, index) => {
            // Letters A–K; shift G–K slightly left for better visual alignment
            if (index >= 6) {
                entry.offset = entry.offset ?? { x: 0, y: 0 };
                entry.offset.x -= hexSize * 0.3;
            }
            const labelElement = document.createElement('div');
            labelElement.className = 'board-label board-label-letter';
            labelElement.textContent = String.fromCharCode(65 + index);
            placeLabel(labelElement, entry);
        });

        const numberEntries = buildNumberLabelEntries(tilesArray);
        numberEntries.slice(0, 11).forEach((entry, index) => {
            const labelElement = document.createElement('div');
            labelElement.className = 'board-label board-label-number';
            labelElement.textContent = String(index + 1);
            placeLabel(labelElement, entry);
        });
    }

    function placeLabel(labelElement, entry) {
        const position = tilePositions.get(coordKey(entry.q, entry.r));
        if (!position) {
            return;
        }
        const offsetX = entry.offset?.x ?? 0;
        const offsetY = entry.offset?.y ?? 0;
        labelElement.style.left = `${position.centerX + offsetX}px`;
        labelElement.style.top = `${position.centerY + offsetY}px`;
        board.appendChild(labelElement);
    }

    // Convert axial coordinates to pixel positions for flat-top hexes
    function axialToPixel(q, r) {
        const x = hexSize * 1.5 * q;
        const y = hexSize * SQRT3 * (r + q / 2);
        return { x, y };
    }

    function colorIndex(q, r) {
        const index = (q - r) % 3;
        return index < 0 ? index + 3 : index;
    }

    function buildLetterLabelEntries(tilesArray) {
        const bottomLeft = tilesArray
            .filter(tile => tile.r === BOARD_RADIUS)
            .sort((a, b) => a.q - b.q)
            .map(tile => ({
                q: tile.q,
                r: tile.r,
                offset: { x: -hexSize * 0.2, y: hexSize * 0.9 }
            }));

        const bottomRight = tilesArray
            .filter(tile => -tile.q - tile.r === -BOARD_RADIUS)
            .sort((a, b) => a.q - b.q)
            .map(tile => ({
                q: tile.q,
                r: tile.r,
                offset: { x: hexSize * 0.2, y: hexSize * 0.9 }
            }));

        if (bottomRight.length > 0) {
            bottomRight.shift();
        }

        return [...bottomLeft, ...bottomRight];
    }

    function buildNumberLabelEntries(tilesArray) {
        const leftVertical = tilesArray
            .filter(tile => tile.q === -BOARD_RADIUS)
            .sort((a, b) => b.r - a.r)
            .map(tile => ({
                q: tile.q,
                r: tile.r,
                offset: { x: -hexSize * 1.25, y: -hexSize * 0.8 }
            }));

        const leftDiagonal = tilesArray
            .filter(tile => -tile.q - tile.r === BOARD_RADIUS)
            .sort((a, b) => b.r - a.r)
            .map(tile => ({
                q: tile.q,
                r: tile.r,
                offset: { x: -hexSize * 1.25, y: -hexSize * 0.8 }
            }));

        if (leftDiagonal.length > 0) {
            leftDiagonal.shift();
        }

        if (leftDiagonal.length >= 2) {
            leftDiagonal[leftDiagonal.length - 2].offset.x -= hexSize * 0.15;
            leftDiagonal[leftDiagonal.length - 1].offset.x -= hexSize * 0.3;
        }

        return [...leftVertical, ...leftDiagonal];
    }

    function coordKey(q, r) {
        return `${q},${r}`;
    }

    window.HexUtils = {
        axialToNotation: (q, r) => {
            const file = String.fromCodePoint(65 + (q + 5)); // A corresponds to q=-5
            const rank = 6 - r;                             // 1 corresponds to r=5
            return `${file}${rank}`;
        },

        notationToAxial: (notation) => {
            if (!notation || notation.length < 2) return null;
            
            const fileChar = notation.charAt(0).toUpperCase();
            const rankStr = notation.slice(1);
            
            const q = fileChar.codePointAt(0) - 65 - 5;
            const r = 6 - Number.parseInt(rankStr, 10);
            
            if (Number.isNaN(q) || Number.isNaN(r)) return null;

            return { q, r };
        }
    };

    function positionToNotation(q, r) {
        return window.HexUtils.axialToNotation(q, r);
    }

    function pieceNotation(piece) {
        const notations = {
            king: 'K',
            queen: 'Q',
            rook: 'R',
            bishop: 'B',
            knight: 'N',
            pawn: ''
        };
        return notations[piece.type] || '';
    }

    function createMoveNotation(piece, fromQ, fromR, toQ, toR, isCapture, isCastle, promotionType = null) {
        if (isCastle) {
            return isCastle.type === 'kingside' ? 'O-O' : 'O-O-O';
        }
        
        const pieceSymbol = pieceNotation(piece);
        const fromSquare = positionToNotation(fromQ, fromR);
        const toSquare = positionToNotation(toQ, toR);
        const captureSymbol = isCapture ? 'x' : '';
        const promotionSymbol = promotionType ? '=' + pieceNotation({ type: promotionType }) : '';
        
        if (piece.type === 'pawn') {
            if (isCapture) {
                // For pawn captures, use the file letter + x + destination
                const fromFile = fromSquare.match(/([A-K])/)?.[1] || '';
                return fromFile + captureSymbol + toSquare + promotionSymbol;
            }
            // For pawn moves, just show destination
            return toSquare + promotionSymbol;
        }
        
        // For pieces, show piece symbol + destination (simplified notation)
        // Standard chess notation doesn't include from-square unless ambiguous
        return pieceSymbol + captureSymbol + toSquare + promotionSymbol;
    }

    function buildInitialPieces() {
        resetPawnStartingSquares();
        const placements = [];

        STARTING_GROUPS.forEach(group => {
            group.coords.forEach(({ q, r }) => {
                placements.push({ q, r, type: group.type, color: 'white' });
                if (group.type === 'pawn') {
                    pawnStartingSquares.white.add(coordKey(q, r));
                }
            });
        });

        STARTING_GROUPS.forEach(group => {
            group.coords.forEach(({ q, r }) => {
                // Mirror only across the horizontal axis for black pieces in axial coords:
                // (q, r) -> (q, -q - r)
                const mirrored = { q, r: -q - r };
                placements.push({ ...mirrored, type: group.type, color: 'black' });
                if (group.type === 'pawn') {
                    pawnStartingSquares.black.add(coordKey(mirrored.q, mirrored.r));
                }
            });
        });

        return placements;
    }

    function buildGameControls() {
        const controls = document.createElement('div');
        controls.id = 'game-controls';

        const topRow = document.createElement('div');
        topRow.className = 'game-controls-row';

        const newGameButton = document.createElement('button');
        newGameButton.type = 'button';
        newGameButton.id = 'new-game-button';
        newGameButton.className = 'control-button';
        newGameButton.textContent = 'New Game';
        newGameButton.addEventListener('click', handleNewGameClick);

        const flipButton = document.createElement('button');
        flipButton.type = 'button';
        flipButton.id = 'flip-board-button';
        flipButton.className = 'control-button';
        flipButton.textContent = 'Flip Board';
        flipButton.addEventListener('click', handleFlipBoardClick);

        const select = document.createElement('select');
        select.id = 'new-game-select';
        select.name = 'new-game';
        select.className = 'control-select';

        const option = document.createElement('option');
        option.value = 'local';
        option.textContent = 'Local Game';
        select.appendChild(option);

        select.addEventListener('click', handleNewGameSelection);
        select.addEventListener('change', handleNewGameSelection);

        topRow.appendChild(newGameButton);
        topRow.appendChild(select);

        controls.appendChild(topRow);
        controls.appendChild(flipButton);
        return controls;
    }

    function buildHistorySidebar() {
        const sidebar = document.createElement('div');
        sidebar.id = 'history-sidebar';

        const header = document.createElement('div');
        header.className = 'history-header';
        header.textContent = 'Moves';

        const movesList = document.createElement('div');
        movesList.id = 'moves-list';
        movesList.className = 'moves-list';

        sidebar.appendChild(header);
        sidebar.appendChild(movesList);

        return sidebar;
    }

    function buildPromotionModal() {
        const modal = document.createElement('div');
        modal.id = 'promotion-modal';
        modal.className = 'promotion-modal';
        modal.style.display = 'none';

        const overlay = document.createElement('div');
        overlay.className = 'promotion-overlay';

        const content = document.createElement('div');
        content.className = 'promotion-content';

        const title = document.createElement('h3');
        title.className = 'promotion-title';
        title.textContent = 'Choose promotion piece:';

        const piecesContainer = document.createElement('div');
        piecesContainer.className = 'promotion-pieces';

        const promotionPieces = ['queen', 'rook', 'bishop', 'knight'];
        
        promotionPieces.forEach(pieceType => {
            const pieceButton = document.createElement('button');
            pieceButton.className = 'promotion-piece';
            pieceButton.dataset.piece = pieceType;
            
            const pieceImg = document.createElement('img');
            pieceImg.src = PIECE_SPRITES.white[pieceType];
            pieceImg.alt = pieceType;
            pieceImg.width = 48;
            pieceImg.height = 48;
            
            const label = document.createElement('div');
            label.className = 'promotion-label';
            label.textContent = pieceType.charAt(0).toUpperCase() + pieceType.slice(1);
            
            pieceButton.appendChild(pieceImg);
            pieceButton.appendChild(label);
            pieceButton.addEventListener('click', () => handlePromotionChoice(pieceType));
            
            piecesContainer.appendChild(pieceButton);
        });

        content.appendChild(title);
        content.appendChild(piecesContainer);
        modal.appendChild(overlay);
        modal.appendChild(content);

        return modal;
    }

    function handleNewGameClick() {
        const select = document.getElementById('new-game-select');
        const mode = select?.value ?? 'local';
        startNewGame(mode);
    }

    function handleNewGameSelection(event) {
        startNewGame(event.target.value);
    }

    function handleFlipBoardClick() {
        flipBoard();
    }

    function startNewGame(mode) {
        if (mode === 'local') {
            if (pendingFlipTimeoutId !== null) {
                clearTimeout(pendingFlipTimeoutId);
                pendingFlipTimeoutId = null;
            }
            currentTurn = 'white';
            applyBoardOrientationForCurrentTurn();
            clearHistory();
            resetBoard();
        }
    }

    function flipBoard() {
        isBoardFlipped = !isBoardFlipped;
        boardContainer.classList.toggle('board-flipped', isBoardFlipped);
    }

    function applyBoardOrientationForCurrentTurn() {
        const isBlackTurn = currentTurn === 'black';
        isBoardFlipped = isBlackTurn;
        boardContainer.classList.toggle('board-flipped', isBoardFlipped);
        boardContainer.classList.toggle('board-turn-black', isBlackTurn);
    }

    function endTurn(piece) {
        currentTurn = piece.color === 'white' ? 'black' : 'white';
        if (pendingFlipTimeoutId !== null) {
            clearTimeout(pendingFlipTimeoutId);
        }
        pendingFlipTimeoutId = window.setTimeout(() => {
            applyBoardOrientationForCurrentTurn();
            pendingFlipTimeoutId = null;
        }, 676);
    }

    function resetPawnStartingSquares() {
        pawnStartingSquares.white.clear();
        pawnStartingSquares.black.clear();
    }

    function addMoveToHistory(notation, color) {
        moveHistory.push({
            notation: notation,
            color: color,
            moveNumber: currentMoveNumber
        });
        
        if (color === 'black') {
            currentMoveNumber++;
        }
        
        updateHistoryDisplay();
    }

    function updateHistoryDisplay() {
        const movesList = document.getElementById('moves-list');
        if (!movesList) return;
        
        movesList.innerHTML = '';
        
        for (let i = 0; i < moveHistory.length; i += 2) {
            const movePair = document.createElement('div');
            movePair.className = 'move-pair';
            
            const moveNumber = document.createElement('span');
            moveNumber.className = 'move-number';
            moveNumber.textContent = Math.floor(i / 2) + 1 + '.';
            
            const whiteMove = moveHistory[i];
            const whiteMoveSpan = document.createElement('span');
            whiteMoveSpan.className = 'move-white move-notation';
            whiteMoveSpan.textContent = whiteMove.notation || '??';
            
            movePair.appendChild(moveNumber);
            movePair.appendChild(whiteMoveSpan);
            
            if (i + 1 < moveHistory.length) {
                const blackMove = moveHistory[i + 1];
                const blackMoveSpan = document.createElement('span');
                blackMoveSpan.className = 'move-black move-notation';
                blackMoveSpan.textContent = blackMove.notation || '??';
                movePair.appendChild(blackMoveSpan);
            }
            
            movesList.appendChild(movePair);
        }
        
        movesList.scrollTop = movesList.scrollHeight;
    }

    function clearHistory() {
        moveHistory.length = 0;
        currentMoveNumber = 1;
        pendingPromotion = null;
        hidePromotionModal();
        updateHistoryDisplay();
    }


    function buildKnightOffsets() {
        const offsets = [];
        const count = STRAIGHT_DIRECTIONS.length;
        STRAIGHT_DIRECTIONS.forEach((dir, index) => {
            const nextDir = STRAIGHT_DIRECTIONS[(index + 1) % count];
            const prevDir = STRAIGHT_DIRECTIONS[(index + count - 1) % count];
            offsets.push({
                q: dir.q * 2 + nextDir.q,
                r: dir.r * 2 + nextDir.r
            });
            offsets.push({
                q: dir.q * 2 + prevDir.q,
                r: dir.r * 2 + prevDir.r
            });
        });
        const seen = new Set();
        return offsets.filter(offset => {
            const key = coordKey(offset.q, offset.r);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
})();
