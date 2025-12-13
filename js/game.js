    (() => {
    const BOARD_RADIUS = 5; // Creates 91 tiles for Gliński's board
    const SQRT3 = Math.sqrt(3);
    const BOARD_FLIP_DELAY = 676; // Delay for board flip animation in milliseconds
    const HISTORY_MODE_ENABLED = true;

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
		    let onlineSession = null;
		    let activeLobbyRef = null;
		    let activeLobbyValueListener = null;
		    let activeMovesRef = null;
		    let activeMovesChildAddedListener = null;
		    const pendingOnlineMovesByPly = new Map();
		    let isApplyingOnlineMove = false;

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
	
  const playerLabelTop = document.createElement('div');
    playerLabelTop.id = 'player-label-top';
    playerLabelTop.className = 'player-label player-label-top';
    playerLabelTop.hidden = true;

    const playerLabelBottom = document.createElement('div');
    playerLabelBottom.id = 'player-label-bottom';
    playerLabelBottom.className = 'player-label player-label-bottom';
    playerLabelBottom.hidden = true;

    const turnIndicator = document.createElement('div');
    turnIndicator.id = 'turn-indicator';
    turnIndicator.className = 'turn-indicator';
    turnIndicator.hidden = true;

    boardContainer.appendChild(playerLabelTop);
    boardContainer.appendChild(playerLabelBottom);
    boardContainer.appendChild(turnIndicator);
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

	    // Add keyboard event listener for history navigation (currently disabled).
	    if (HISTORY_MODE_ENABLED) {
	        document.addEventListener('keydown', handleKeyDown);
	    }

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

	        if (!canMakeOnlineMoveNow()) {
	            clearSelection();
	            showNewGameNotice('Waiting for opponent...');
	            return;
	        }
        
        // Exit history mode when making a move
        if (currentHistoryIndex !== -1) {
            // Restore the actual game state first
            replayToPosition(moveHistory.length);
            currentHistoryIndex = -1;
            updateHistoryHighlight();
            isGameOver = checkForGameOverState();
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
            let q = piece.q + dir.q;
            let r = piece.r + dir.r;
            let steps = 0;
            while (tilePositions.has(coordKey(q, r))) {
                steps++;
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
            console.log(`Queen at (${piece.q},${piece.r}): direction ${JSON.stringify(dir)} - ${steps} steps`);
        });

        console.log(`Total moves for queen: ${moves.length}`);
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
	        if (!canMakeOnlineMoveNow()) {
	            clearSelection();
	            showNewGameNotice('Waiting for opponent...');
	            return;
	        }
        const piece = piecesById.get(selectedPieceId);
        if (!piece) {
            return;
        }
	        if (piece.color !== currentTurn) {
	            clearSelection();
	            return;
	        }
	        if (
	            onlineSession?.lobbyId &&
	            (onlineSession?.myColor === 'white' || onlineSession?.myColor === 'black') &&
	            piece.color !== onlineSession.myColor
	        ) {
	            clearSelection();
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
	                captureId: move.captureId ?? null,
                castle: move.castle
            };
            showPromotionModal(piece.color);
            return;
        }

        completeMove(piece, fromQ, fromR, move, isCapture, null, move.captureId ?? null);
    }

    function completeMove(piece, fromQ, fromR, move, isCapture, promotionType = null, captureId = null) {
	        if (!isApplyingOnlineMove) {
	            if (piece.color !== currentTurn) {
	                return;
	            }
	            if (onlineSession?.lobbyId) {
	                if (!canMakeOnlineMoveNow()) {
	                    return;
	                }
	                if (
	                    (onlineSession?.myColor === 'white' || onlineSession?.myColor === 'black') &&
	                    piece.color !== onlineSession.myColor
	                ) {
	                    return;
	                }
	            }
	        }
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
		        addMoveToHistory(
		            moveNotation,
		            piece.color,
		            piece,
		            fromQ,
		            fromR,
		            piece.q,
		            piece.r,
		            isCapture,
		            move.castle,
		            promotionType,
		            captureId ?? null
		        );
		        syncOnlineMoveIfNeeded(piece, fromQ, fromR, move, promotionType, captureId);
	        
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
        
        const { piece, fromQ, fromR, toQ, toR, isCapture, captureId, castle } = pendingPromotion;

	        if (onlineSession?.lobbyId) {
	            if (!canMakeOnlineMoveNow()) {
	                hidePromotionModal();
	                pendingPromotion = null;
	                showNewGameNotice('Waiting for opponent...');
	                return;
	            }
	            if (
	                (onlineSession?.myColor === 'white' || onlineSession?.myColor === 'black') &&
	                piece?.color &&
	                piece.color !== onlineSession.myColor
	            ) {
	                hidePromotionModal();
	                pendingPromotion = null;
	                return;
	            }
	        }
	        if (piece?.color && piece.color !== currentTurn) {
	            hidePromotionModal();
	            pendingPromotion = null;
	            return;
	        }
        
        hidePromotionModal();
        
        completeMove(piece, fromQ, fromR, { q: toQ, r: toR, castle: castle }, isCapture, promotionType, captureId ?? null);
        
        pendingPromotion = null;
    }

		    function syncOnlineMoveIfNeeded(piece, fromQ, fromR, move, promotionType, captureId) {
		        if (isApplyingOnlineMove) {
		            return;
		        }
		        if (!onlineSession?.lobbyId) {
		            return;
		        }
		        if (!ensureFirebaseDatabase()) {
		            return;
		        }
		        const myColor = onlineSession?.myColor;
		        if (!myColor) {
		            return;
		        }
		        if (myColor !== 'both' && myColor !== piece.color) {
		            return;
		        }
		        if (!authenticatedUser?.uid) {
		            return;
		        }
		        const expectedUid = expectedUidForColor(piece.color);
		        if (!expectedUid || expectedUid !== authenticatedUser.uid) {
		            return;
		        }
		        const ply = moveHistory.length - 1;
		        if (ply < 0) {
		            return;
		        }
		        const nextTurn = piece.color === 'white' ? 'black' : 'white';
		        const lobbyId = onlineSession.lobbyId;
		        const lobbyRef = firebaseDatabaseInstance.ref(`lobbies/${lobbyId}`);
		        const moveRef = lobbyRef.child('moves').child(String(ply));
		        const record = {
		            v: 1,
		            ply,
		            byUid: authenticatedUser.uid,
		            color: piece.color,
		            nextTurn,
		            pieceId: piece.id,
		            from: { q: fromQ, r: fromR },
		            to: { q: move.q, r: move.r },
		            captureId: typeof captureId === 'string' ? captureId : null,
		            castle: move.castle
		                ? {
		                        rookId: move.castle.rookId ?? null,
		                        rookToQ: move.castle.rookToQ,
		                        rookToR: move.castle.rookToR
		                    }
		                : null,
		            promotionType: promotionType || null,
		            createdAt: firebase.database.ServerValue.TIMESTAMP
		        };

		        moveRef
		            .transaction(current => {
		                if (current) {
		                    return; // abort
		                }
		                return record;
		            })
		            .then(result => {
		                if (!result?.committed) {
		                    return;
		                }
		                return lobbyRef.child('game').update({
		                    currentTurn: nextTurn,
		                    updatedAt: firebase.database.ServerValue.TIMESTAMP
		                });
		            })
		            .catch(error => {
		                console.warn('Failed to sync move:', error);
		            });
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

    function updatePiecePosition(piece, animate = true) {
        if (!piece.element) {
            return;
        }
        const position = tilePositions.get(coordKey(piece.q, piece.r));
        if (!position) {
            return;
        }
        if (!animate) {
            piece.element.style.transition = 'none';
        }
        piece.element.style.left = `${position.centerX - pieceSize / 2}px`;
        piece.element.style.top = `${position.centerY - pieceSize / 2}px`;
        if (!animate) {
            void piece.element.offsetWidth;
            piece.element.style.transition = '';
        }
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
        
        const headerText = document.createElement('span');
        headerText.textContent = 'Moves';
        header.appendChild(headerText);
        
        const historyIndicator = document.createElement('span');
        historyIndicator.id = 'history-indicator';
        historyIndicator.className = 'history-indicator';
        historyIndicator.textContent = '(History Mode)';
        historyIndicator.style.display = 'none';
        header.appendChild(historyIndicator);

        const movesList = document.createElement('div');
        movesList.id = 'moves-list';
        movesList.className = 'moves-list';

        const exitHistoryButton = document.createElement('button');
        exitHistoryButton.type = 'button';
        exitHistoryButton.id = 'exit-history-button';
        exitHistoryButton.className = 'control-button exit-history-button';
        exitHistoryButton.textContent = 'EXIT HISTORY MODE';
        exitHistoryButton.style.display = 'none';
        exitHistoryButton.addEventListener('click', exitHistoryMode);

        sidebar.appendChild(header);
        sidebar.appendChild(movesList);
        sidebar.appendChild(exitHistoryButton);

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
            clearOnlineSession();
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
            updateTurnIndicator();
            return;
        }

	        if (mode === 'create-online') {
	            if (!authenticatedUser) {
	                showNewGameNotice('Please sign in to create an online game.');
	                return;
	            }
	            hideNewGameNotice();
	            clearOnlineSession();
	            createOnlineGameLobby();
	            return;
	        }

	        if (mode === 'join-online') {
	            if (!authenticatedUser) {
	                showNewGameNotice('Please sign in to join an online lobby.');
	                return;
	            }
	            hideNewGameNotice();
	            clearOnlineSession();
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
	        updateOnlinePlayerLabels();
	    }

		    function applyBoardOrientationForCurrentTurn() {
		        const isBlackTurn = currentTurn === 'black';
		        boardContainer.classList.toggle('board-turn-black', isBlackTurn);

		        if (onlineSession && onlineSession.lobbyId) {
		            // In online games, always orient the board so the current player is at the bottom
		            if (onlineSession.myColor !== 'both') {
		                // For regular online games, keep the player's color at the bottom
		                const shouldBeFlipped = onlineSession.myColor === 'black';
		                if (isBoardFlipped !== shouldBeFlipped) {
		                    isBoardFlipped = shouldBeFlipped;
		                    boardContainer.classList.toggle('board-flipped', isBoardFlipped);
		                    updateOnlinePlayerLabels();
		                }
		                return;
		            }
		            // For self-play (both colors), flip based on current turn
		        }
		        const shouldBeFlipped = isBlackTurn;
		        
		        // Force a transition by first removing the class, then adding it
		        if (isBoardFlipped === shouldBeFlipped) {
	            // No change needed, but force animation anyway
	            boardContainer.classList.remove('board-flipped');
	            void boardContainer.offsetWidth; // Force reflow
	        }
	        
	        isBoardFlipped = shouldBeFlipped;
	        boardContainer.classList.toggle('board-flipped', isBoardFlipped);
	        updateOnlinePlayerLabels();
	    }

    function endTurn(piece) {
        currentTurn = piece.color === 'white' ? 'black' : 'white';
        if (pendingFlipTimeoutId !== null) {
            clearTimeout(pendingFlipTimeoutId);
        }
        
        // Update turn indicator for online games
        if (onlineSession && onlineSession.lobbyId) {
            updateTurnIndicator();
        }
        
        // In online multiplayer, don't flip the board - keep current player at bottom
        if (onlineSession && onlineSession.lobbyId && onlineSession.myColor !== 'both') {
            // Just update the turn indicator, but don't flip the board
            applyBoardOrientationForCurrentTurn();
            updateKingInCheckHighlight();
            checkForCheckmate();
        } else {
            // For local games or self-play, use the delayed flip animation
            pendingFlipTimeoutId = window.setTimeout(() => {
                applyBoardOrientationForCurrentTurn();
                pendingFlipTimeoutId = null;
            }, BOARD_FLIP_DELAY);
            updateKingInCheckHighlight();
            checkForCheckmate();
        }
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
        // Don't check for checkmate when viewing history
        if (currentHistoryIndex !== -1) {
            return;
        }
        
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

	    function addMoveToHistory(
	        notation,
	        color,
	        piece,
	        fromQ,
	        fromR,
	        toQ,
	        toR,
	        isCapture,
	        castleInfo,
	        promotionType,
	        capturedPieceId
	    ) {
	        moveHistory.push({
	            notation: notation,
	            color: color,
	            moveNumber: currentMoveNumber,
	            piece: { ...piece }, // Store piece data
	            fromQ: fromQ,
	            fromR: fromR,
	            toQ: toQ,
	            toR: toR,
	            isCapture: isCapture,
	            castle: castleInfo,
	            promotionType: promotionType,
	            capturedPieceId: isCapture ? (capturedPieceId ?? null) : null
	        });
        
        if (color === 'black') {
            currentMoveNumber++;
        }
        
        // Reset history index to latest when new move is made
        currentHistoryIndex = -1;
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
            whiteMoveSpan.addEventListener('click', () => jumpToMove(i));
            
            movePair.appendChild(moveNumber);
            movePair.appendChild(whiteMoveSpan);
            
            if (i + 1 < moveHistory.length) {
                const blackMove = moveHistory[i + 1];
                const blackMoveSpan = document.createElement('span');
                blackMoveSpan.className = 'move-black move-notation';
                blackMoveSpan.textContent = blackMove.notation || '??';
                blackMoveSpan.addEventListener('click', () => jumpToMove(i + 1));
                movePair.appendChild(blackMoveSpan);
            }
            
            movesList.appendChild(movePair);
        }
        
        movesList.scrollTop = movesList.scrollHeight;
    }

    function jumpToMove(moveIndex) {
        if (moveIndex < 0 || moveIndex >= moveHistory.length) return;
        
        currentHistoryIndex = moveIndex;
        replayToPosition(moveIndex + 1, true);
        isGameOver = false;
        updateHistoryHighlight();
    }

    function clearHistory() {
        moveHistory.length = 0;
        currentMoveNumber = 1;
        currentHistoryIndex = -1;
        pendingPromotion = null;
        hidePromotionModal();
        updateHistoryDisplay();
    }

    function handleKeyDown(event) {
        // Only handle arrow keys when no modal is shown and not typing in input fields
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        const modalVisible = document.getElementById('promotion-modal')?.style.display === 'block' ||
                            document.getElementById('online-game-modal')?.style.display === 'flex';
        
        if (modalVisible) {
            return;
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            navigateHistory(-1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            navigateHistory(1);
        }
    }

    function navigateHistory(direction) {
        if (moveHistory.length === 0) return;

        const oldIndex = currentHistoryIndex;
        const newIndex = currentHistoryIndex + direction;
        
        // Clamp to valid range: -1 (latest) to moveHistory.length - 1 (first move)
        const clampedIndex = Math.max(-1, Math.min(moveHistory.length - 1, newIndex));
        
        if (clampedIndex === currentHistoryIndex) {
            return; // No change needed
        }
        
        currentHistoryIndex = clampedIndex;
        
        // Check if we're going backwards (left arrow)
        const goingBackwards = direction < 0;
        
        if (currentHistoryIndex === -1) {
            // Show the latest position - replay all moves
            replayToPosition(moveHistory.length, true, goingBackwards);
            // Restore actual game state
            isGameOver = checkForGameOverState();
        } else {
            // Show position up to currentHistoryIndex
            replayToPosition(currentHistoryIndex + 1, true, goingBackwards);
            // When viewing history, we're not in a game over state
            isGameOver = false;
        }
        
        updateHistoryHighlight();
    }

    function checkForGameOverState() {
        const sideToMove = currentTurn;
        const inCheck = isKingInCheck(sideToMove);
        const hasMoves = hasAnyLegalMoves(sideToMove);
        
        if (!hasMoves) {
            if (inCheck) {
                return true; // Checkmate
            } else {
                return true; // Stalemate
            }
        }
        return false;
    }

    function replayToPosition(moveCount, animateLastMove = false, reverseAnimation = false) {
        // If going backwards and animating, we need to show the piece at its destination first,
        // then animate it back to its source
        if (animateLastMove && reverseAnimation && moveCount > 0) {
            const moveToAnimate = moveHistory[moveCount - 1];
            if (moveToAnimate) {
                // First, set up the board at the target position (moveCount)
                initEmptyBoard();
                const freshPieces = createInitialPieces();
                placePieces(freshPieces);
                currentTurn = 'white';
                clearLastMoveHighlight();
                clearSelection();
                
                // Replay all moves up to moveCount WITHOUT animation
                for (let i = 0; i < moveCount && i < moveHistory.length; i++) {
                    const move = moveHistory[i];
                    const pieceId = move.piece.id;
                    const piece = piecesById.get(pieceId);
                    
                    if (!piece) continue;
                    
                    if (move.isCapture && move.capturedPieceId) {
                        const capturedPiece = piecesById.get(move.capturedPieceId);
                        if (capturedPiece) {
                            const capturedKey = coordKey(capturedPiece.q, capturedPiece.r);
                            boardOccupancy.delete(capturedKey);
                            capturedPiece.isCaptured = true;
                            if (capturedPiece.element?.parentNode) {
                                capturedPiece.element.parentNode.removeChild(capturedPiece.element);
                            }
                        }
                    }
                    
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
                            updatePiecePosition(rook, false);
                        }
                    }
                    
                    if (move.promotionType) {
                        piece.type = move.promotionType;
                        piece.element.src = PIECE_SPRITES[piece.color][move.promotionType];
                        piece.element.alt = `${piece.color} ${move.promotionType}`;
                    }
                    
                    const fromKey = coordKey(piece.q, piece.r);
                    boardOccupancy.delete(fromKey);
                    
                    piece.q = move.toQ;
                    piece.r = move.toR;
                    piece.hasMoved = true;
                    
                    const destinationKey = coordKey(piece.q, piece.r);
                    boardOccupancy.set(destinationKey, piece.id);
                    updatePiecePosition(piece, false);
                    
                    currentTurn = move.color === 'white' ? 'black' : 'white';
                }
                
                // Now animate the last move in reverse
                const pieceId = moveToAnimate.piece.id;
                const piece = piecesById.get(pieceId);
                
                if (piece && piece.element) {
                    // Temporarily position piece at destination (toQ, toR)
                    const destPos = tilePositions.get(coordKey(moveToAnimate.toQ, moveToAnimate.toR));
                    if (destPos) {
                        piece.element.style.transition = 'none';
                        piece.element.style.left = `${destPos.centerX - pieceSize / 2}px`;
                        piece.element.style.top = `${destPos.centerY - pieceSize / 2}px`;
                        void piece.element.offsetWidth; // Force reflow
                        piece.element.style.transition = '';
                        
                        // Now animate back to source (fromQ, fromR)
                        setTimeout(() => {
                            const sourcePos = tilePositions.get(coordKey(moveToAnimate.fromQ, moveToAnimate.fromR));
                            if (sourcePos) {
                                piece.element.style.left = `${sourcePos.centerX - pieceSize / 2}px`;
                                piece.element.style.top = `${sourcePos.centerY - pieceSize / 2}px`;
                            }
                        }, 10);
                    }
                }
                
                // Now set up the board at moveCount - 1 (the previous position)
                setTimeout(() => {
                    initEmptyBoard();
                    const freshPieces2 = createInitialPieces();
                    placePieces(freshPieces2);
                    currentTurn = 'white';
                    clearLastMoveHighlight();
                    clearSelection();
                    
                    for (let i = 0; i < moveCount - 1 && i < moveHistory.length; i++) {
                        const move = moveHistory[i];
                        const pieceId = move.piece.id;
                        const piece = piecesById.get(pieceId);
                        
                        if (!piece) continue;
                        
                        if (move.isCapture && move.capturedPieceId) {
                            const capturedPiece = piecesById.get(move.capturedPieceId);
                            if (capturedPiece) {
                                const capturedKey = coordKey(capturedPiece.q, capturedPiece.r);
                                boardOccupancy.delete(capturedKey);
                                capturedPiece.isCaptured = true;
                                if (capturedPiece.element?.parentNode) {
                                    capturedPiece.element.parentNode.removeChild(capturedPiece.element);
                                }
                            }
                        }
                        
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
                                updatePiecePosition(rook, false);
                            }
                        }
                        
                        if (move.promotionType) {
                            piece.type = move.promotionType;
                            piece.element.src = PIECE_SPRITES[piece.color][move.promotionType];
                            piece.element.alt = `${piece.color} ${move.promotionType}`;
                        }
                        
                        const fromKey = coordKey(piece.q, piece.r);
                        boardOccupancy.delete(fromKey);
                        
                        piece.q = move.toQ;
                        piece.r = move.toR;
                        piece.hasMoved = true;
                        
                        const destinationKey = coordKey(piece.q, piece.r);
                        boardOccupancy.set(destinationKey, piece.id);
                        updatePiecePosition(piece, false);
                        
                        currentTurn = move.color === 'white' ? 'black' : 'white';
                        
                        if (i === moveCount - 2) {
                            highlightLastMove(move.fromQ, move.fromR, move.toQ, move.toR);
                        }
                    }
                    
                    updateKingInCheckHighlight();
                }, 620);
                
                return;
            }
        }
        
        // Normal forward animation or no animation
        initEmptyBoard();
        const freshPieces = createInitialPieces();
        placePieces(freshPieces);
        currentTurn = 'white';
        clearLastMoveHighlight();
        clearSelection();
        
        // Replay moves up to moveCount
        for (let i = 0; i < moveCount && i < moveHistory.length; i++) {
            const move = moveHistory[i];
            const isLastMove = (i === moveCount - 1);
            const shouldAnimate = animateLastMove && isLastMove && !reverseAnimation;
            
            // Find the piece that made this move
            const pieceId = move.piece.id;
            const piece = piecesById.get(pieceId);
            
            if (!piece) continue;
            
            // Handle capture if there was one
            if (move.isCapture && move.capturedPieceId) {
                const capturedPiece = piecesById.get(move.capturedPieceId);
                if (capturedPiece) {
                    const capturedKey = coordKey(capturedPiece.q, capturedPiece.r);
                    boardOccupancy.delete(capturedKey);
                    capturedPiece.isCaptured = true;
                    if (capturedPiece.element?.parentNode) {
                        capturedPiece.element.parentNode.removeChild(capturedPiece.element);
                    }
                }
            }
            
            // Handle castling
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
                    updatePiecePosition(rook, shouldAnimate);
                }
            }
            
            // Handle promotion
            if (move.promotionType) {
                piece.type = move.promotionType;
                piece.element.src = PIECE_SPRITES[piece.color][move.promotionType];
                piece.element.alt = `${piece.color} ${move.promotionType}`;
            }
            
            // Move the piece
            const fromKey = coordKey(piece.q, piece.r);
            boardOccupancy.delete(fromKey);
            
            piece.q = move.toQ;
            piece.r = move.toR;
            piece.hasMoved = true;
            
            const destinationKey = coordKey(piece.q, piece.r);
            boardOccupancy.set(destinationKey, piece.id);
            updatePiecePosition(piece, shouldAnimate);
            
            // Update turn
            currentTurn = move.color === 'white' ? 'black' : 'white';
            
            // Highlight the last move if this is the final move being replayed
            if (isLastMove) {
                highlightLastMove(move.fromQ, move.fromR, move.toQ, move.toR);
            }
        }
        
        // Update king in check highlight
        updateKingInCheckHighlight();
    }

    function updateHistoryHighlight() {
        const movesList = document.getElementById('moves-list');
        const historyIndicator = document.getElementById('history-indicator');
        const exitButton = document.getElementById('exit-history-button');
        if (!movesList) return;
        
        // Remove all existing highlights
        movesList.querySelectorAll('.move-notation').forEach(el => {
            el.classList.remove('history-current');
        });
        
        // Show/hide history indicator and exit button
        if (historyIndicator) {
            if (currentHistoryIndex >= 0) {
                historyIndicator.style.display = 'inline';
                historyIndicator.style.marginLeft = '0.5rem';
                historyIndicator.style.color = '#ff6b35';
                historyIndicator.style.fontWeight = '600';
                historyIndicator.style.fontSize = '0.85rem';
            } else {
                historyIndicator.style.display = 'none';
            }
        }
        
        if (exitButton) {
            exitButton.style.display = currentHistoryIndex >= 0 ? 'block' : 'none';
        }
        
        // Add highlight to current position
        if (currentHistoryIndex >= 0) {
            const moveElements = movesList.querySelectorAll('.move-notation');
            if (moveElements[currentHistoryIndex]) {
                moveElements[currentHistoryIndex].classList.add('history-current');
            }
        }
    }

    function exitHistoryMode() {
        if (currentHistoryIndex === -1) return;
        
        replayToPosition(moveHistory.length, false);
        currentHistoryIndex = -1;
        updateHistoryHighlight();
        isGameOver = checkForGameOverState();
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

		    function normalizeLobbyStatus(status) {
		        return typeof status === 'string' ? status.trim().toLowerCase() : '';
		    }

	    function stopActiveLobbyListeners() {
	        if (activeLobbyRef && activeLobbyValueListener) {
	            activeLobbyRef.off('value', activeLobbyValueListener);
	        }
	        activeLobbyRef = null;
	        activeLobbyValueListener = null;

	        if (activeMovesRef && activeMovesChildAddedListener) {
	            activeMovesRef.off('child_added', activeMovesChildAddedListener);
	        }
	        activeMovesRef = null;
	        activeMovesChildAddedListener = null;
	        pendingOnlineMovesByPly.clear();
	    }

  function updateOnlinePlayerLabels() {
        const topEl = document.getElementById('player-label-top');
        const bottomEl = document.getElementById('player-label-bottom');
        if (!topEl || !bottomEl) {
            return;
        }
        if (!onlineSession || !onlineSession.roles) {
            topEl.hidden = true;
            bottomEl.hidden = true;
            topEl.textContent = '';
            bottomEl.textContent = '';
            updateTurnIndicator();
            return;
        }
        const whiteText = onlineSession.roles.whiteName ? `White: ${onlineSession.roles.whiteName}` : 'White';
        const blackText = onlineSession.roles.blackName ? `Black: ${onlineSession.roles.blackName}` : 'Black';
        const bottomText = isBoardFlipped ? blackText : whiteText;
        const topText = isBoardFlipped ? whiteText : blackText;
        bottomEl.textContent = bottomText;
        topEl.textContent = topText;
        topEl.hidden = false;
        bottomEl.hidden = false;
        updateTurnIndicator();
    }

    function updateTurnIndicator() {
        const turnEl = document.getElementById('turn-indicator');
        if (!turnEl) {
            return;
        }
        
        if (!onlineSession || !onlineSession.roles) {
            turnEl.hidden = true;
            turnEl.textContent = '';
            return;
        }
        
        const currentTurnText = currentTurn === 'white' ? 'White' : 'Black';
        const currentTurnName = currentTurn === 'white' ? onlineSession.roles.whiteName : onlineSession.roles.blackName;
        const playerName = currentTurnName ? currentTurnName : currentTurnText;
        
        turnEl.textContent = `${currentTurnText}'s Turn (${playerName})`;
        turnEl.hidden = false;
        
        // Highlight if it's the current player's turn
        const myColor = onlineSession.myColor;
        if (myColor && myColor !== 'both' && currentTurn === myColor) {
            turnEl.style.background = 'rgba(76, 175, 80, 0.95)';
            turnEl.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
        } else {
            turnEl.style.background = 'rgba(60, 85, 200, 0.95)';
            turnEl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        }
    }

function clearOnlineSession() {
        stopActiveLobbyListeners();
        onlineSession = null;
        activeLobbyId = null;
        updateOnlinePlayerLabels();
        updateTurnIndicator();
    }

		    function setOnlineSession(session) {
		        onlineSession = session;
		        updateOnlinePlayerLabels();
		    }

		    function setBoardFlippedTo(value) {
		        const shouldFlip = !!value;
		        isBoardFlipped = shouldFlip;
		        boardContainer.classList.toggle('board-flipped', isBoardFlipped);
		        updateOnlinePlayerLabels();
		    }

		    function hashStringToUint32(text) {
		        let hash = 2166136261;
		        for (let i = 0; i < text.length; i += 1) {
		            hash ^= text.charCodeAt(i);
		            hash = Math.imul(hash, 16777619);
		        }
		        return hash >>> 0;
		    }

		    function deriveRolesForUser(lobby, user, lobbyId) {
		        const roles = lobby?.roles;
		        if (roles && roles.whiteUid && roles.blackUid) {
		            const isWhite = user?.uid && roles.whiteUid === user.uid;
		            const isBlack = user?.uid && roles.blackUid === user.uid;
		            if (!isWhite && !isBlack) {
		                return null;
		            }
		            if (isWhite && isBlack) {
		                return {
		                    myColor: 'both',
		                    roles: {
		                        whiteUid: roles.whiteUid,
		                        blackUid: roles.blackUid,
		                        whiteName: roles.whiteName || 'White',
		                        blackName: roles.blackName || 'Black'
		                    }
		                };
		            }
		            return {
		                myColor: isWhite ? 'white' : 'black',
		                roles: {
		                    whiteUid: roles.whiteUid,
		                    blackUid: roles.blackUid,
		                    whiteName: roles.whiteName || 'White',
		                    blackName: roles.blackName || 'Black'
		                }
		            };
		        }

		        const hostUid = lobby?.host?.uid;
		        const guestUid = lobby?.guest?.uid;
		        if (!hostUid || !guestUid || !user?.uid) {
		            return null;
		        }
		        if (hostUid === user.uid && guestUid === user.uid) {
		            const name = lobby.host?.displayName || lobby.host?.email || user.displayName || user.email || 'Player';
		            return {
		                myColor: 'both',
		                roles: {
		                    whiteUid: user.uid,
		                    blackUid: user.uid,
		                    whiteName: `${name} (White)`,
		                    blackName: `${name} (Black)`
		                }
		            };
		        }

		        const hostName = lobby.host?.displayName || lobby.host?.email || 'Host';
		        const guestName = lobby.guest?.displayName || lobby.guest?.email || 'Guest';
		        const seed = typeof lobbyId === 'string' && lobbyId ? lobbyId : String(lobby?.createdAt || '');
		        const hostIsWhite = (hashStringToUint32(`${seed}|${hostUid}|${guestUid}`) & 1) === 0;
		        const resolvedRoles = hostIsWhite
		            ? {
		                    whiteUid: hostUid,
		                    blackUid: guestUid,
		                    whiteName: hostName,
		                    blackName: guestName
		                }
		            : {
		                    whiteUid: guestUid,
		                    blackUid: hostUid,
		                    whiteName: guestName,
		                    blackName: hostName
		                };

		        const isWhite = resolvedRoles.whiteUid === user.uid;
		        const isBlack = resolvedRoles.blackUid === user.uid;
		        if (!isWhite && !isBlack) {
		            return null;
		        }
		        return {
		            myColor: isWhite ? 'white' : 'black',
		            roles: resolvedRoles
		        };
		    }

		    function startLobbyListener(lobbyId, { isHost } = {}) {
		        if (!ensureFirebaseDatabase()) {
		            return;
		        }
		        stopActiveLobbyListeners();
		        activeLobbyId = lobbyId;
		        activeLobbyRef = firebaseDatabaseInstance.ref(`lobbies/${lobbyId}`);
		        activeLobbyValueListener = snapshot => {
		            const lobby = snapshot.val();
		            if (!lobby) {
		                setOnlineModalAction('close');
		                setOnlineModalState({
		                    description: 'Lobby ended.',
		                    lobbyId: '',
		                    canCopy: false
		                });
		                clearOnlineSession();
		                return;
		            }

			            const derived = deriveRolesForUser(lobby, authenticatedUser, lobbyId);
		            if (derived) {
		                const hasAppliedInitialOrientation = !!onlineSession?.hasAppliedInitialOrientation;
		                if (!hasAppliedInitialOrientation) {
		                    // Always orient the board so the current player is at the bottom
		                    setBoardFlippedTo(derived.myColor === 'black');
		                }
		                setOnlineSession({
		                    lobbyId,
		                    isHost: !!isHost,
		                    myColor: derived.myColor,
		                    roles: derived.roles,
		                    hasAppliedInitialOrientation: true
		                });
		                startOnlineMoveListener(lobbyId);
		            }

		            const status = normalizeLobbyStatus(lobby.status);
		            const guestName = lobby?.guest?.displayName || lobby?.guest?.email || null;
		            if (isHost && status === 'active' && guestName) {
		                const youAre = onlineSession?.myColor ? ` You are ${onlineSession.myColor}.` : '';
		                setOnlineModalAction('close');
		                setOnlineModalState({
		                    description: `Player joined: ${guestName}.${youAre}`,
		                    lobbyId,
		                    canCopy: true
		                });
		                window.setTimeout(() => {
		                    hideOnlineGameModal();
		                }, 650);
		            }
		        };
		        activeLobbyRef.on('value', activeLobbyValueListener);
		    }

		    function expectedUidForColor(color) {
		        if (!onlineSession?.roles) {
		            return null;
		        }
		        if (color === 'white') {
		            return onlineSession.roles.whiteUid || null;
		        }
		        if (color === 'black') {
		            return onlineSession.roles.blackUid || null;
		        }
		        return null;
		    }

		    function canMakeOnlineMoveNow() {
		        if (!onlineSession?.lobbyId) {
		            return true; // local game
		        }
		        if (!authenticatedUser?.uid) {
		            return false;
		        }
		        const myColor = onlineSession?.myColor;
		        if (!myColor) {
		            return false;
		        }
		        if (myColor === 'both') {
		            const expectedUid = expectedUidForColor(currentTurn);
		            if (!expectedUid || expectedUid !== authenticatedUser.uid) {
		                return false;
		            }
		        } else {
		            const expectedUid = expectedUidForColor(myColor);
		            if (!expectedUid || expectedUid !== authenticatedUser.uid) {
		                return false;
		            }
		            if (currentTurn !== myColor) {
		                return false;
		            }
		        }
		        return true;
		    }

		    function startOnlineMoveListener(lobbyId) {
		        if (!ensureFirebaseDatabase()) {
		            return;
		        }
		        if (activeMovesRef && activeLobbyId === lobbyId) {
		            return;
		        }
		        if (activeMovesRef && activeMovesChildAddedListener) {
		            activeMovesRef.off('child_added', activeMovesChildAddedListener);
		        }
		        activeMovesRef = firebaseDatabaseInstance.ref(`lobbies/${lobbyId}/moves`);
		        activeMovesChildAddedListener = snapshot => {
		            const record = snapshot.val();
		            if (!record || typeof record.ply !== 'number') {
		                return;
		            }
		            pendingOnlineMovesByPly.set(record.ply, record);
		            tryApplyPendingOnlineMoves();
		        };
		        activeMovesRef.on('child_added', activeMovesChildAddedListener);
		    }

		    function tryApplyPendingOnlineMoves() {
		        if (!onlineSession?.lobbyId) {
		            return;
		        }
		        if (!onlineSession?.roles) {
		            return;
		        }

		        while (pendingOnlineMovesByPly.has(moveHistory.length)) {
		            const record = pendingOnlineMovesByPly.get(moveHistory.length);
		            pendingOnlineMovesByPly.delete(moveHistory.length);
		            const applied = applyOnlineMoveRecord(record);
		            if (!applied) {
		                // If something looks wrong, stop applying further moves.
		                pendingOnlineMovesByPly.set(record.ply, record);
		                break;
		            }
		        }
		    }

		    function applyOnlineMoveRecord(record) {
		        if (!record || typeof record.ply !== 'number') {
		            return false;
		        }
		        if (record.ply !== moveHistory.length) {
		            return false;
		        }
		        if (record.color !== 'white' && record.color !== 'black') {
		            return false;
		        }

		        const expectedUid = expectedUidForColor(record.color);
		        if (!expectedUid || record.byUid !== expectedUid) {
		            return false;
		        }
		        if (record.color !== currentTurn) {
		            return false;
		        }

		        const fromQ = record?.from?.q;
		        const fromR = record?.from?.r;
		        const toQ = record?.to?.q;
		        const toR = record?.to?.r;
		        if (![fromQ, fromR, toQ, toR].every(Number.isFinite)) {
		            return false;
		        }

		        const pieceId = typeof record.pieceId === 'string' ? record.pieceId : '';
		        const piece = piecesById.get(pieceId);
		        if (!piece || piece.isCaptured) {
		            return false;
		        }
		        if (piece.color !== record.color) {
		            return false;
		        }
		        if (piece.q !== fromQ || piece.r !== fromR) {
		            return false;
		        }

		        // Exit history mode when receiving a move.
		        if (currentHistoryIndex !== -1) {
		            replayToPosition(moveHistory.length);
		            currentHistoryIndex = -1;
		            updateHistoryHighlight();
		            isGameOver = checkForGameOverState();
		        }

		        const legalMoves = getLegalMovesForPiece(piece);
		        const candidate = legalMoves.find(move => move.q === toQ && move.r === toR);
		        if (!candidate) {
		            return false;
		        }

		        const recordCaptureId = typeof record.captureId === 'string' ? record.captureId : null;
		        if (!!candidate.captureId !== !!recordCaptureId) {
		            return false;
		        }
		        if (recordCaptureId && candidate.captureId !== recordCaptureId) {
		            return false;
		        }

		        const recordCastle = record.castle ?? null;
		        if (recordCastle) {
		            if (
		                !candidate.castle ||
		                candidate.castle.rookId !== recordCastle.rookId ||
		                candidate.castle.rookToQ !== recordCastle.rookToQ ||
		                candidate.castle.rookToR !== recordCastle.rookToR
		            ) {
		                return false;
		            }
		        } else if (candidate.castle) {
		            return false;
		        }

		        const recordPromotion = typeof record.promotionType === 'string' ? record.promotionType : null;
		        if (piece.type === 'pawn' && isPawnPromotionSquare(piece, candidate.q, candidate.r) && !recordPromotion) {
		            return false;
		        }

		        const fromKey = coordKey(piece.q, piece.r);
		        boardOccupancy.delete(fromKey);
		        if (recordCaptureId) {
		            capturePiece(recordCaptureId);
		        }

		        isApplyingOnlineMove = true;
		        try {
		            completeMove(
		                piece,
		                fromQ,
		                fromR,
		                { q: candidate.q, r: candidate.r, castle: candidate.castle },
		                !!recordCaptureId,
		                recordPromotion,
		                recordCaptureId
		            );
		        } finally {
		            isApplyingOnlineMove = false;
		        }
		        hideNewGameNotice();
		        return true;
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
	            game: serializeBoardState(),
	            moves: {}
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
	                setOnlineSession({
	                    lobbyId,
	                    isHost: true,
	                    myColor: null,
	                    roles: null,
	                    hasAppliedInitialOrientation: false
	                });
	                startLobbyListener(lobbyId, { isHost: true });
	                setOnlineModalState({
	                    description: 'Lobby created! Share this ID with a friend.',
	                    lobbyId: lobbyId,
	                    canCopy: true
	                });
	            })
	            .catch(error => {
	                console.error('Failed to create lobby:', error);
	                clearOnlineSession();
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
        updateTurnIndicator();
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

				        const guestData = {
				            uid: authenticatedUser.uid,
				            displayName: authenticatedUser.displayName || 'Guest',
				            email: authenticatedUser.email || null,
				            joinedAt: firebase.database.ServerValue.TIMESTAMP
				        };

					        const statusRef = lobbyRef.child('status');
					        const rolesRef = lobbyRef.child('roles');
					        let didClaimLobby = false;
					        let didWriteGuest = false;

				        statusRef
				            .transaction(status => {
				                const normalized = normalizeLobbyStatus(status);
				                if (!normalized || normalized === 'waiting') {
				                    return 'active';
				                }
				                return; // abort
				            })
				            .then(result => {
				                didClaimLobby = !!result?.committed;
				                return lobbyRef.once('value').then(snapshot => ({
				                    result,
				                    lobby: snapshot?.val?.() ?? null
				                }));
				            })
				            .then(({ result, lobby }) => {
				                if (!lobby) {
				                    throw new Error('Lobby not found.');
				                }
				                const status = normalizeLobbyStatus(lobby.status);
				                const canRejoin =
				                    status &&
				                    status !== 'waiting' &&
				                    lobby.guest?.uid &&
				                    lobby.guest.uid === guestData.uid;
				                if (!result?.committed) {
				                    if (!canRejoin) {
				                        if (status && status !== 'waiting') {
				                            throw new Error('Lobby was already taken.');
				                        }
				                        throw new Error('Failed to join lobby. Please try again.');
				                    }
				                }

					                const hostUid = lobby.host?.uid;
					                const hostName = lobby.host?.displayName || lobby.host?.email || 'Host';
					                const guestName = guestData.displayName || guestData.email || 'Guest';
					                const guestWrite = lobbyRef
					                    .child('guest')
					                    .set(guestData)
					                    .then(() => {
					                        didWriteGuest = true;
					                    });
					                const rolesWrite = rolesRef.transaction(currentRoles => {
					                    if (currentRoles && currentRoles.whiteUid && currentRoles.blackUid) {
					                        return; // abort
					                    }
					                    if (!hostUid) {
					                        return; // abort
				                    }
				                    const hostIsWhite = Math.random() < 0.5;
				                    return {
				                        whiteUid: hostIsWhite ? hostUid : guestData.uid,
				                        blackUid: hostIsWhite ? guestData.uid : hostUid,
				                        whiteName: hostIsWhite ? hostName : guestName,
				                        blackName: hostIsWhite ? guestName : hostName,
					                        assignedAt: firebase.database.ServerValue.TIMESTAMP
					                    };
					                }).catch(error => {
					                    console.warn('Failed to assign roles:', error);
					                });
					                return Promise.all([guestWrite, rolesWrite]).then(() => lobbyRef.once('value'));
					            })
				            .then(snapshot => snapshot?.val?.() ?? null)
				            .then(lobby => {
				                if (!lobby) {
				                    throw new Error('Lobby not found.');
				                }

				                activeLobbyId = lobbyId;
				                setOnlineSession({
				                    lobbyId,
				                    isHost: false,
				                    myColor: null,
				                    roles: null,
				                    hasAppliedInitialOrientation: false
				                });
				                startLobbyListener(lobbyId, { isHost: false });

				                if (lobby.game) {
				                    applyBoardState(lobby.game);
				                }

				                const derived = deriveRolesForUser(lobby, authenticatedUser, lobbyId);
				                const myColor = derived?.myColor || null;
				                if (derived) {
				                    setOnlineSession({
				                        lobbyId,
				                        isHost: false,
				                        myColor,
				                        roles: derived.roles,
				                        hasAppliedInitialOrientation: true
				                    });
				                    // Always orient the board so the current player is at the bottom
				                    setBoardFlippedTo(myColor === 'black');
				                }

				                setOnlineModalState({
				                    description: myColor ? `Joined lobby. You are ${myColor}.` : 'Joined lobby.',
				                    lobbyId,
				                    canCopy: true
				                });
				                window.setTimeout(() => {
				                    hideOnlineGameModal();
				                }, 650);
				            })
					            .catch(error => {
					                console.error('Failed to join lobby:', error);
					                if (didClaimLobby && !didWriteGuest) {
					                    statusRef.set('waiting').catch(() => {});
					                }
					                clearOnlineSession();
					                setOnlineModalState({
					                    description: error.message || 'Failed to join lobby.',
				                    lobbyId: '',
				                    canCopy: false
				                });
				            });
				    }

		    function cancelOnlineLobby() {
		        const lobbyIdToDelete = activeLobbyId;
		        clearOnlineSession();
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
