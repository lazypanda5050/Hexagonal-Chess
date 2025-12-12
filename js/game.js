    (() => {
    const BOARD_RADIUS = 5; // Creates 91 tiles for Gliński's board
    const SQRT3 = Math.sqrt(3);
    const BOARD_FLIP_DELAY = 676; // Delay for board flip animation in milliseconds

    const appRoot = document.getElementById('app');
    if (!appRoot) {
        return;
    }

    let authenticatedUser = null;
    let firebaseAppInstance = null;
    let firebaseDatabaseInstance = null;
    let newGameNoticeTimeoutId = null;

    const authUI = buildAuthPopup();
    if (authUI && document.body) {
        document.body.appendChild(authUI.container);
        initializeFirebaseAuth(authUI);
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
	    let isGameOver = false;
	    let activeLobbyId = null;
	    let onlineModalAction = 'close';

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
    const KING_DIRECTIONS = [
        { q: 1, r: 0 },
        { q: -1, r: 0 },
        { q: 0, r: 1 },
        { q: 0, r: -1 },
        { q: 1, r: -1 },
        { q: -1, r: 1 },
        { q: 2, r: -1 },
        { q: -2, r: 1 },
        { q: 1, r: 1 },
        { q: -1, r: -1 },
        { q: 1, r: -2 },
        { q: -1, r: 2 }
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

    const gameOverOverlay = buildGameOverOverlay();
    boardContainer.appendChild(gameOverOverlay);

    const layout = document.createElement('div');
    layout.id = 'game-layout';
    const controls = buildGameControls();
    const historySidebar = buildHistorySidebar();
    const sidePanel = document.createElement('div');
    sidePanel.id = 'side-panel';
    sidePanel.appendChild(controls);
    sidePanel.appendChild(historySidebar);
    const promotionModal = buildPromotionModal();
    const onlineGameModal = buildOnlineGameModal();
    layout.appendChild(boardContainer);
    layout.appendChild(sidePanel);

    appRoot.appendChild(layout);
    appRoot.appendChild(promotionModal);
    appRoot.appendChild(onlineGameModal);

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
            pieceElement.addEventListener('click', (e) => {
                e.stopPropagation();
                handleTileClick(piece.q, piece.r);
            });
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
        if (isGameOver) {
            return;
        }
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
        const moves = getLegalMovesForPiece(piece);
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
        availableMoves = precomputedMoves ?? getLegalMovesForPiece(piece);
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
        const opponentColor = piece.color === 'white' ? 'black' : 'white';

        KING_DIRECTIONS.forEach(dir => {
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
        const kingInCheckNow = isKingInCheck(piece.color);

        if (!piece.hasMoved && !piece.isCaptured && !kingInCheckNow) {
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
                    if (
                        tilePositions.has(throughKey) &&
                        !boardOccupancy.has(throughKey) &&
                        !isSquareAttacked(throughSquare.q, throughSquare.r, opponentColor)
                    ) {
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
                        const safeSquares = [
                            queenStart,
                            { q: queenSideKnightStart.q, r: queenSideKnightStart.r }
                        ];
                        const pathIsSafe = safeSquares.every(
                            square => !isSquareAttacked(square.q, square.r, opponentColor)
                        );

                        if (
                            rook &&
                            rook.type === 'rook' &&
                            rook.color === piece.color &&
                            !rook.isCaptured &&
                            !rook.hasMoved &&
                            pathIsSafe
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

    function findKing(color) {
        let king = null;
        piecesById.forEach(piece => {
            if (piece.type === 'king' && piece.color === color && !piece.isCaptured) {
                king = piece;
            }
        });
        return king;
    }

    function doesSliderAttackSquare(piece, targetQ, targetR, directions) {
        for (const dir of directions) {
            let q = piece.q + dir.q;
            let r = piece.r + dir.r;
            while (tilePositions.has(coordKey(q, r))) {
                if (q === targetQ && r === targetR) {
                    return true;
                }
                const key = coordKey(q, r);
                if (boardOccupancy.has(key)) {
                    break;
                }
                q += dir.q;
                r += dir.r;
            }
        }
        return false;
    }

    function doesPieceAttackSquare(piece, targetQ, targetR) {
        if (!piece || piece.isCaptured) {
            return false;
        }
        switch (piece.type) {
            case 'pawn': {
                const captureDirs =
                    piece.color === 'white'
                        ? [
                              { q: 1, r: -1 },
                              { q: -1, r: 0 }
                          ]
                        : [
                              { q: 1, r: 0 },
                              { q: -1, r: 1 }
                          ];
                return captureDirs.some(
                    dir => piece.q + dir.q === targetQ && piece.r + dir.r === targetR
                );
            }
            case 'knight':
                return KNIGHT_OFFSETS.some(
                    offset => piece.q + offset.q === targetQ && piece.r + offset.r === targetR
                );
            case 'king':
                return KING_DIRECTIONS.some(
                    dir => piece.q + dir.q === targetQ && piece.r + dir.r === targetR
                );
            case 'rook':
                return doesSliderAttackSquare(piece, targetQ, targetR, STRAIGHT_DIRECTIONS);
            case 'bishop':
                return doesSliderAttackSquare(piece, targetQ, targetR, BISHOP_DIRECTIONS);
            case 'queen':
                return (
                    doesSliderAttackSquare(piece, targetQ, targetR, STRAIGHT_DIRECTIONS) ||
                    doesSliderAttackSquare(piece, targetQ, targetR, BISHOP_DIRECTIONS)
                );
            default:
                return false;
        }
    }

    function isSquareAttacked(q, r, attackingColor) {
        let attacked = false;
        piecesById.forEach(piece => {
            if (attacked) {
                return;
            }
            if (piece.color !== attackingColor || piece.isCaptured) {
                return;
            }
            if (doesPieceAttackSquare(piece, q, r)) {
                attacked = true;
            }
        });
        return attacked;
    }

    function isKingInCheck(color) {
        const king = findKing(color);
        if (!king) {
            return false;
        }

        const opponentColor = color === 'white' ? 'black' : 'white';
        return isSquareAttacked(king.q, king.r, opponentColor);
    }

    function doesMoveLeaveKingInCheck(piece, move) {
        const fromQ = piece.q;
        const fromR = piece.r;
        const fromKey = coordKey(fromQ, fromR);
        const toQ = move.q;
        const toR = move.r;
        const toKey = coordKey(toQ, toR);
        const originalHasMoved = piece.hasMoved;

        const capturedPiece = move.captureId ? piecesById.get(move.captureId) : null;
        let capturedOriginalQ = null;
        let capturedOriginalR = null;
        let capturedOriginalIsCaptured = null;

        if (capturedPiece) {
            capturedOriginalQ = capturedPiece.q;
            capturedOriginalR = capturedPiece.r;
            capturedOriginalIsCaptured = capturedPiece.isCaptured;
        }

        const castleInfo = move.castle;
        const rook = castleInfo ? piecesById.get(castleInfo.rookId ?? '') : null;
        let rookOriginalQ = null;
        let rookOriginalR = null;
        let rookOriginalHasMoved = null;

        if (rook && !rook.isCaptured) {
            rookOriginalQ = rook.q;
            rookOriginalR = rook.r;
            rookOriginalHasMoved = rook.hasMoved;
        }

        // Apply simulated move
        boardOccupancy.delete(fromKey);

        if (capturedPiece) {
            const capturedKey = coordKey(capturedPiece.q, capturedPiece.r);
            boardOccupancy.delete(capturedKey);
            capturedPiece.isCaptured = true;
        }

        piece.q = toQ;
        piece.r = toR;
        piece.hasMoved = true;
        boardOccupancy.set(toKey, piece.id);

        if (rook && !rook.isCaptured) {
            const rookFromKey = coordKey(rook.q, rook.r);
            boardOccupancy.delete(rookFromKey);
            rook.q = castleInfo.rookToQ;
            rook.r = castleInfo.rookToR;
            rook.hasMoved = true;
            const rookToKey = coordKey(rook.q, rook.r);
            boardOccupancy.set(rookToKey, rook.id);
        }

        const kingInCheck = isKingInCheck(piece.color);

        // Revert simulated move
        boardOccupancy.delete(toKey);
        piece.q = fromQ;
        piece.r = fromR;
        piece.hasMoved = originalHasMoved;
        boardOccupancy.set(fromKey, piece.id);

        if (rook && !rook.isCaptured) {
            const rookToKey = coordKey(rook.q, rook.r);
            boardOccupancy.delete(rookToKey);
            rook.q = rookOriginalQ;
            rook.r = rookOriginalR;
            rook.hasMoved = rookOriginalHasMoved;
            const rookOriginalKey = coordKey(rook.q, rook.r);
            boardOccupancy.set(rookOriginalKey, rook.id);
        }

        if (capturedPiece) {
            capturedPiece.q = capturedOriginalQ;
            capturedPiece.r = capturedOriginalR;
            capturedPiece.isCaptured = capturedOriginalIsCaptured;
            const capturedKey = coordKey(capturedPiece.q, capturedPiece.r);
            boardOccupancy.set(capturedKey, capturedPiece.id);
        }

        return kingInCheck;
    }

    function getLegalMovesForPiece(piece) {
        const pseudoLegalMoves = getMovesForPiece(piece);
        return pseudoLegalMoves.filter(move => !doesMoveLeaveKingInCheck(piece, move));
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
        if (piece.type !== 'pawn') {
            return false;
        }

        // Pawns promote when they reach the board edge in their forward direction.
        // Instead of checking absolute ranks (which differ depending on the file),
        // detect when there is no tile one more step ahead.
        const forwardDir = piece.color === 'white' ? { q: 0, r: -1 } : { q: 0, r: 1 };
        const nextQ = q + forwardDir.q;
        const nextR = r + forwardDir.r;
        return !tilePositions.has(coordKey(nextQ, nextR));
    }

    function moveSelectedPieceTo(move) {
        if (!selectedPieceId) {
            return;
        }
        const piece = piecesById.get(selectedPieceId);
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

            // Validate coordinates are within board bounds
            const s = -q - r;
            if (Math.abs(q) > BOARD_RADIUS || Math.abs(r) > BOARD_RADIUS || Math.abs(s) > BOARD_RADIUS) {
                return null;
            }

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
        const opponentColor = piece.color === 'white' ? 'black' : 'white';
        let notation;

        if (isCastle) {
            notation = isCastle.type === 'kingside' ? 'O-O' : 'O-O-O';
        } else {
            const pieceSymbol = pieceNotation(piece);
            const fromSquare = positionToNotation(fromQ, fromR);
            const toSquare = positionToNotation(toQ, toR);
            const captureSymbol = isCapture ? 'x' : '';
            const promotionSymbol = promotionType ? '=' + pieceNotation({ type: promotionType }) : '';

            if (piece.type === 'pawn') {
                if (isCapture) {
                    // For pawn captures, use the file letter + x + destination
                    const fromFile = fromSquare.match(/([A-K])/)?.[1] || '';
                    notation = fromFile + captureSymbol + toSquare + promotionSymbol;
                } else {
                    // For pawn moves, just show destination
                    notation = toSquare + promotionSymbol;
                }
            } else {
                // For pieces, show piece symbol + destination (simplified notation)
                // Standard chess notation doesn't include from-square unless ambiguous
                notation = pieceSymbol + captureSymbol + toSquare + promotionSymbol;
            }
        }

        const inCheck = isKingInCheck(opponentColor);
        if (inCheck) {
            const opponentHasMoves = hasAnyLegalMoves(opponentColor);
            notation += opponentHasMoves ? '+' : '#';
        }

        return notation;
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

        const localOption = document.createElement('option');
        localOption.value = 'local';
        localOption.textContent = 'Local Game';
        select.appendChild(localOption);

        const onlineOption = document.createElement('option');
        onlineOption.value = 'create-online';
        onlineOption.textContent = 'Create Online Game';
        select.appendChild(onlineOption);

        const joinOption = document.createElement('option');
        joinOption.value = 'join-online';
        joinOption.textContent = 'Join Online Lobby';
        select.appendChild(joinOption);

        select.addEventListener('change', handleNewGameSelection);

        topRow.appendChild(newGameButton);
        topRow.appendChild(select);

        const notice = document.createElement('div');
        notice.id = 'new-game-notice';
        notice.className = 'control-notice';
        notice.hidden = true;

        controls.appendChild(topRow);
        controls.appendChild(notice);
        controls.appendChild(flipButton);
        return controls;
    }

    function buildGameOverOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'game-over-overlay';
        overlay.className = 'game-over-overlay';
        overlay.style.display = 'none';

        const content = document.createElement('div');
        content.className = 'game-over-content';

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'game-over-close';
        closeButton.textContent = '✕';
        closeButton.addEventListener('click', () => {
            hideGameOverOverlay();
        });

        const title = document.createElement('div');
        title.className = 'game-over-title';
        title.textContent = 'Checkmate!';

        const subtitle = document.createElement('div');
        subtitle.className = 'game-over-subtitle';
        subtitle.textContent = '';

        content.appendChild(closeButton);
        content.appendChild(title);
        content.appendChild(subtitle);
        overlay.appendChild(content);

        return overlay;
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

    function buildOnlineGameModal() {
        const modal = document.createElement('div');
        modal.id = 'online-game-modal';
        modal.className = 'online-game-modal';
        modal.style.display = 'none';

        const overlay = document.createElement('div');
        overlay.className = 'online-game-overlay';

        const content = document.createElement('div');
        content.className = 'online-game-content';

        const title = document.createElement('h3');
        title.className = 'online-game-title';
        title.textContent = 'Online Game Lobby';

        const description = document.createElement('p');
        description.className = 'online-game-description';
        description.id = 'online-game-description';
        description.textContent = 'Create a lobby to share with a friend.';

        const lobbyInfo = document.createElement('div');
        lobbyInfo.className = 'online-game-lobby';

        const lobbyLabel = document.createElement('div');
        lobbyLabel.className = 'online-game-lobby-label';
        lobbyLabel.textContent = 'Lobby ID';

        const lobbyId = document.createElement('div');
        lobbyId.className = 'online-game-lobby-id';
        lobbyId.id = 'online-game-lobby-id';
        lobbyId.textContent = '';

        const copyButton = document.createElement('button');
        copyButton.type = 'button';
        copyButton.className = 'online-game-copy';
        copyButton.id = 'online-game-copy';
        copyButton.textContent = 'Copy ID';
        copyButton.disabled = true;
        copyButton.addEventListener('click', () => {
            const idText = lobbyId.textContent;
            if (!idText) return;
            if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(idText).catch(() => {});
            } else {
                window.prompt('Copy this lobby ID:', idText);
            }
        });

        lobbyInfo.appendChild(lobbyLabel);
        lobbyInfo.appendChild(lobbyId);
        lobbyInfo.appendChild(copyButton);

	        const actionButton = document.createElement('button');
	        actionButton.type = 'button';
	        actionButton.className = 'online-game-close';
	        actionButton.id = 'online-game-action';
	        actionButton.textContent = 'Close';

	        const handleAction = () => {
	            if (onlineModalAction === 'cancel') {
	                cancelOnlineLobby();
	                return;
	            }
	            hideOnlineGameModal();
	        };

	        actionButton.addEventListener('click', handleAction);
	        overlay.addEventListener('click', handleAction);

	        content.appendChild(title);
	        content.appendChild(description);
	        content.appendChild(lobbyInfo);
	        content.appendChild(actionButton);
	        modal.appendChild(overlay);
	        modal.appendChild(content);

	        return modal;
	    }

    function showGameOverOverlay(message) {
        const overlay = document.getElementById('game-over-overlay');
        if (!overlay) {
            return;
        }
        const subtitle = overlay.querySelector('.game-over-subtitle');
        if (subtitle) {
            subtitle.textContent = message;
        }
        overlay.style.display = 'block';
    }

    function hideGameOverOverlay() {
        const overlay = document.getElementById('game-over-overlay');
        if (!overlay) {
            return;
        }
        overlay.style.display = 'none';
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
            isGameOver = false;
            applyBoardOrientationForCurrentTurn();
            clearHistory();
            resetBoard();
            hideGameOverOverlay();
            return;
        }

        if (mode === 'create-online') {
            if (!authenticatedUser) {
                showNewGameNotice('Please sign in to create an online game.');
                return;
            }
            hideNewGameNotice();
            createOnlineGameLobby();
            return;
        }

        if (mode === 'join-online') {
            if (!authenticatedUser) {
                showNewGameNotice('Please sign in to join an online lobby.');
                return;
            }
            hideNewGameNotice();
            const lobbyId = window.prompt('Enter Lobby ID to join:');
            if (!lobbyId) {
                return;
            }
            joinOnlineLobby(lobbyId.trim().toUpperCase());
        }
    }

    function flipBoard() {
        isBoardFlipped = !isBoardFlipped;
        boardContainer.classList.toggle('board-flipped', isBoardFlipped);
    }

    function applyBoardOrientationForCurrentTurn() {
        const isBlackTurn = currentTurn === 'black';
        const shouldBeFlipped = isBlackTurn;
        
        // Force a transition by first removing the class, then adding it
        if (isBoardFlipped === shouldBeFlipped) {
            // No change needed, but force animation anyway
            boardContainer.classList.remove('board-flipped');
            void boardContainer.offsetWidth; // Force reflow
        }
        
        isBoardFlipped = shouldBeFlipped;
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
        }, BOARD_FLIP_DELAY);
        updateKingInCheckHighlight();
        checkForCheckmate();
    }

    function clearKingInCheckHighlights() {
        piecesById.forEach(piece => {
            if (piece.type === 'king' && piece.element) {
                piece.element.classList.remove('piece-king-in-check');
            }
        });
    }

    function updateKingInCheckHighlight() {
        clearKingInCheckHighlights();
        ['white', 'black'].forEach(color => {
            if (isKingInCheck(color)) {
                const king = findKing(color);
                if (king?.element) {
                    king.element.classList.add('piece-king-in-check');
                }
            }
        });
    }

    function hasAnyLegalMoves(color) {
        let hasMoves = false;
        piecesById.forEach(piece => {
            if (hasMoves) {
                return;
            }
            if (piece.color !== color || piece.isCaptured) {
                return;
            }
            const moves = getLegalMovesForPiece(piece);
            if (moves.length > 0) {
                hasMoves = true;
            }
        });
        return hasMoves;
    }

    function checkForCheckmate() {
        const sideToMove = currentTurn;
        const inCheck = isKingInCheck(sideToMove);
        const hasMoves = hasAnyLegalMoves(sideToMove);
        
        if (!hasMoves) {
            if (inCheck) {
                const winner = sideToMove === 'white' ? 'Black' : 'White';
                showGameOverOverlay(`Checkmate! ${winner} Wins!`);
            } else {
                showGameOverOverlay('Stalemate! Draw!');
            }
            isGameOver = true;
        }
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

    function showOnlineGameModal() {
        const modal = document.getElementById('online-game-modal');
        if (!modal) {
            return;
        }
        modal.style.display = 'flex';
    }

    function hideOnlineGameModal() {
        const modal = document.getElementById('online-game-modal');
        if (!modal) {
            return;
        }
        modal.style.display = 'none';
    }

	    function setOnlineModalState({ description, lobbyId, canCopy } = {}) {
	        const descriptionEl = document.getElementById('online-game-description');
	        const lobbyIdEl = document.getElementById('online-game-lobby-id');
	        const copyButton = document.getElementById('online-game-copy');
        if (descriptionEl && typeof description === 'string') {
            descriptionEl.textContent = description;
        }
        if (lobbyIdEl && typeof lobbyId === 'string') {
            lobbyIdEl.textContent = lobbyId;
        }
        if (copyButton && typeof canCopy === 'boolean') {
            copyButton.disabled = !canCopy;
	        }
	    }

	    function setOnlineModalAction(action) {
	        onlineModalAction = action === 'cancel' ? 'cancel' : 'close';
	        const actionButton = document.getElementById('online-game-action');
	        if (actionButton) {
	            actionButton.textContent = onlineModalAction === 'cancel' ? 'Cancel Lobby' : 'Close';
	        }
	    }

    function generateLobbyId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const length = Math.floor(Math.random() * 5) + 6; // 6-10 chars
        let id = '';
        for (let i = 0; i < length; i += 1) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    function serializeBoardState() {
        const pieces = [];
        piecesById.forEach(piece => {
            pieces.push({
                id: piece.id,
                type: piece.type,
                color: piece.color,
                q: piece.q,
                r: piece.r,
                hasMoved: piece.hasMoved,
                isCaptured: piece.isCaptured
            });
        });
        return {
            boardRadius: BOARD_RADIUS,
            currentTurn,
            pieces,
            moveHistory: []
        };
    }

	    function createOnlineGameLobby() {
	        if (!ensureFirebaseDatabase()) {
	            showNewGameNotice('Realtime Database not initialized.');
	            return;
	        }
        // Ensure a fresh starting position for the lobby.
        currentTurn = 'white';
        isGameOver = false;
        applyBoardOrientationForCurrentTurn();
        clearHistory();
        resetBoard();
        hideGameOverOverlay();

	        const lobbyId = generateLobbyId();
	        activeLobbyId = lobbyId;
	        const lobbyRef = firebaseDatabaseInstance.ref(`lobbies/${lobbyId}`);
        const lobbyData = {
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            status: 'waiting',
            host: {
                uid: authenticatedUser.uid,
                displayName: authenticatedUser.displayName || 'Host',
                email: authenticatedUser.email || null
            },
            game: serializeBoardState()
        };

	        showOnlineGameModal();
	        setOnlineModalAction('cancel');
	        setOnlineModalState({
	            description: 'Creating lobby…',
	            lobbyId: lobbyId,
	            canCopy: false
	        });

        lobbyRef
            .set(lobbyData)
            .then(() => {
                setOnlineModalState({
                    description: 'Lobby created! Share this ID with a friend.',
                    lobbyId: lobbyId,
                    canCopy: true
                });
            })
            .catch(error => {
                console.error('Failed to create lobby:', error);
                activeLobbyId = null;
                setOnlineModalState({
                    description: 'Failed to create lobby. Please try again.',
                    lobbyId: '',
                    canCopy: false
                });
            });
    }

    function applyBoardState(state) {
        if (!state || !Array.isArray(state.pieces)) {
            return;
        }
        initEmptyBoard();
        // Restore pieces from state.
        const pieces = state.pieces.map(piece => ({
            id: piece.id,
            type: piece.type,
            color: piece.color,
            q: piece.q,
            r: piece.r,
            hasMoved: !!piece.hasMoved,
            initialQ: piece.q,
            initialR: piece.r,
            element: null,
            isCaptured: !!piece.isCaptured
        }));
        // Keep counter ahead of any numeric ids to avoid collisions.
        pieceIdCounter = pieces.length;
        placePieces(pieces);

        currentTurn = state.currentTurn || 'white';
        pendingPromotion = null;
        isGameOver = false;
        clearHistory();
        applyBoardOrientationForCurrentTurn();
    }

		    function joinOnlineLobby(lobbyId) {
		        if (!ensureFirebaseDatabase()) {
		            showNewGameNotice('Realtime Database not initialized.');
		            return;
		        }
		        if (!lobbyId) {
		            return;
		        }

		        const lobbyRef = firebaseDatabaseInstance.ref(`lobbies/${lobbyId}`);

		        showOnlineGameModal();
		        setOnlineModalAction('close');
		        setOnlineModalState({
		            description: 'Joining lobby…',
		            lobbyId,
		            canCopy: false
		        });

		        const statusRef = lobbyRef.child('status');
		        const guestData = {
		            uid: authenticatedUser.uid,
		            displayName: authenticatedUser.displayName || 'Guest',
		            email: authenticatedUser.email || null,
		            joinedAt: firebase.database.ServerValue.TIMESTAMP
		        };

		        // Ensure the lobby exists before attempting to claim it, then atomically
		        // flip status from waiting -> active (treat missing status as joinable).
		        lobbyRef
		            .once('value')
		            .then(snapshot => {
		                const lobby = snapshot.val();
		                if (!lobby) {
		                    throw new Error('Lobby not found.');
		                }
		                return statusRef.transaction(status => {
		                    const normalized = typeof status === 'string' ? status.trim().toLowerCase() : null;
		                    if (!normalized || normalized === 'waiting') {
		                        return 'active';
		                    }
		                    return; // abort
		                });
		            })
		            .then(result => {
		                if (!result.committed) {
		                    throw new Error('Lobby was already taken.');
		                }
		                // Set guest info separately to avoid overwriting lobby.
		                return lobbyRef.child('guest').set(guestData);
		            })
		            .then(() => lobbyRef.once('value'))
		            .then(snapshot => {
		                const lobby = snapshot.val();
		                if (!lobby) {
		                    throw new Error('Lobby not found.');
		                }
		                activeLobbyId = lobbyId;
		                if (lobby.game) {
		                    applyBoardState(lobby.game);
		                }
		                setOnlineModalState({
		                    description: 'Joined lobby. Game is linked (moves not synced yet).',
		                    lobbyId,
		                    canCopy: true
		                });
		            })
		            .catch(error => {
		                console.error('Failed to join lobby:', error);
		                activeLobbyId = null;
		                setOnlineModalState({
		                    description: error.message || 'Failed to join lobby.',
		                    lobbyId: '',
		                    canCopy: false
		                });
		            });
		    }

	    function cancelOnlineLobby() {
	        const lobbyIdToDelete = activeLobbyId;
	        activeLobbyId = null;
	        setOnlineModalAction('close');

	        setOnlineModalState({
	            description: 'Create a lobby to share with a friend.',
	            lobbyId: '',
	            canCopy: false
	        });

	        if (!lobbyIdToDelete || !ensureFirebaseDatabase()) {
	            hideOnlineGameModal();
	            return;
	        }

	        firebaseDatabaseInstance
	            .ref(`lobbies/${lobbyIdToDelete}`)
	            .remove()
	            .catch(error => {
	                console.warn('Failed to delete lobby:', error);
	            })
	            .finally(() => {
	                hideOnlineGameModal();
	            });
	    }

    function ensureFirebaseDatabase() {
        if (firebaseDatabaseInstance) {
            return true;
        }
        if (!window.firebase || !firebase.database) {
            return false;
        }
        try {
            const app =
                firebaseAppInstance ||
                (firebase.apps && firebase.apps.length ? firebase.app() : null);
            firebaseDatabaseInstance = app ? firebase.database(app) : firebase.database();
            return !!firebaseDatabaseInstance;
        } catch (error) {
            console.warn('Realtime Database unavailable:', error);
            firebaseDatabaseInstance = null;
            return false;
        }
    }

    function showNewGameNotice(message) {
        const notice = document.getElementById('new-game-notice');
        if (!notice) {
            window.alert(message);
            return;
        }
        notice.textContent = message;
        notice.hidden = false;
        if (newGameNoticeTimeoutId !== null) {
            clearTimeout(newGameNoticeTimeoutId);
        }
        newGameNoticeTimeoutId = window.setTimeout(() => {
            hideNewGameNotice();
        }, 4000);
    }

    function hideNewGameNotice() {
        const notice = document.getElementById('new-game-notice');
        if (!notice) {
            return;
        }
        notice.hidden = true;
        notice.textContent = '';
        if (newGameNoticeTimeoutId !== null) {
            clearTimeout(newGameNoticeTimeoutId);
            newGameNoticeTimeoutId = null;
        }
    }

    function buildAuthPopup() {
        if (!document || !document.body) {
            return null;
        }

        const container = document.createElement('div');
        container.id = 'auth-popup';
        container.className = 'auth-popup';

        const signInButton = document.createElement('button');
        signInButton.type = 'button';
        signInButton.id = 'google-sign-in';
        signInButton.className = 'auth-button';
        signInButton.textContent = 'Sign in with Google';

        const userContainer = document.createElement('div');
        userContainer.id = 'auth-user';
        userContainer.className = 'auth-user';
        userContainer.hidden = true;

        const photoElement = document.createElement('img');
        photoElement.id = 'auth-user-photo';
        photoElement.width = 40;
        photoElement.height = 40;
        photoElement.alt = 'Signed in user avatar';
        photoElement.hidden = true;

        const details = document.createElement('div');
        details.className = 'auth-user-details';

        const nameElement = document.createElement('span');
        nameElement.id = 'auth-user-name';
        nameElement.className = 'auth-user-name';

        const emailElement = document.createElement('span');
        emailElement.id = 'auth-user-email';
        emailElement.className = 'auth-user-email';

        details.appendChild(nameElement);
        details.appendChild(emailElement);

        const signOutButton = document.createElement('button');
        signOutButton.type = 'button';
        signOutButton.id = 'sign-out-button';
        signOutButton.className = 'auth-button auth-button-secondary';
        signOutButton.textContent = 'Sign out';

        userContainer.appendChild(photoElement);
        userContainer.appendChild(details);
        userContainer.appendChild(signOutButton);

        container.appendChild(signInButton);
        container.appendChild(userContainer);

        return {
            container,
            signInButton,
            signOutButton,
            userContainer,
            nameElement,
            emailElement,
            photoElement
        };
    }

    function initializeFirebaseAuth(authUIElements) {
        if (!authUIElements) {
            return;
        }

        if (!window.firebase) {
            console.warn('Firebase SDK unavailable; authentication disabled.');
            return;
        }
        if (typeof firebaseConfig === 'undefined') {
            console.warn('firebaseConfig missing; authentication disabled.');
            return;
        }

        let firebaseApp;
        try {
            firebaseApp = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            return;
        }
        firebaseAppInstance = firebaseApp;
        // Database SDK might not be loaded on every host (e.g., bookmarklet). Lazy init later too.
        ensureFirebaseDatabase();

        const auth = firebase.auth(firebaseApp);
        const provider = new firebase.auth.GoogleAuthProvider();
        const {
            signInButton,
            signOutButton,
            userContainer,
            nameElement,
            emailElement,
            photoElement
        } = authUIElements;

        const setLoadingState = isLoading => {
            signInButton.disabled = isLoading;
            signOutButton.disabled = isLoading;
        };

        const updateSignedInState = user => {
            if (user) {
                signInButton.hidden = true;
                userContainer.hidden = false;
                nameElement.textContent = user.displayName || 'Google User';
                emailElement.textContent = user.email || '';
                if (user.photoURL) {
                    photoElement.src = user.photoURL;
                    photoElement.hidden = false;
                } else {
                    photoElement.hidden = true;
                    photoElement.removeAttribute('src');
                }
            } else {
                signInButton.hidden = false;
                userContainer.hidden = true;
                nameElement.textContent = '';
                emailElement.textContent = '';
                photoElement.removeAttribute('src');
                photoElement.hidden = true;
            }
        };

        signInButton.addEventListener('click', () => {
            setLoadingState(true);
            auth.signInWithPopup(provider).catch(error => {
                console.error('Google sign-in failed:', error);
                setLoadingState(false);
            });
        });

        signOutButton.addEventListener('click', () => {
            setLoadingState(true);
            auth.signOut().catch(error => {
                console.error('Sign out failed:', error);
                setLoadingState(false);
            });
        });

        auth.onAuthStateChanged(user => {
            setLoadingState(false);
            updateSignedInState(user);
            authenticatedUser = user;
            if (authenticatedUser) {
                hideNewGameNotice();
            }
        });

        authenticatedUser = auth.currentUser;
        updateSignedInState(auth.currentUser);
        if (authenticatedUser) {
            hideNewGameNotice();
        }
    }
})();
