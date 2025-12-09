(() => {
    const BOARD_RADIUS = 5; // Creates 91 tiles for Gliński's board
    const SQRT3 = Math.sqrt(3);

    const appRoot = document.getElementById('app');
    if (!appRoot) {
        return;
    }

    const rootStyles = getComputedStyle(document.documentElement);
    const hexSize = parseFloat(rootStyles.getPropertyValue('--hex-size')) || 46;
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
    let pieceIdCounter = 0;
    let selectedPieceId = null;
    let availableMoves = [];
    const highlightedTiles = [];

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
    layout.appendChild(boardContainer);
    layout.appendChild(controls);

    appRoot.appendChild(layout);

    resetBoard();

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

    function resetBoard() {
        clearSelection();
        board.querySelectorAll('.piece').forEach(pieceElement => {
            pieceElement.parentNode?.removeChild(pieceElement);
        });
        piecesById.clear();
        boardOccupancy.clear();
        pieceIdCounter = 0;
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
        swapBlackRoyalPositions(basePieces);
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
        const move = availableMoves.find(entry => entry.q === q && entry.r === r);
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
        if (!piece || piece.isCaptured || piece.type !== 'pawn') {
            clearSelection();
            return;
        }
        if (selectedPieceId === piece.id) {
            clearSelection();
            return;
        }
        selectPiece(piece);
    }

    function selectPiece(piece) {
        selectedPieceId = piece.id;
        availableMoves = getPawnMoves(piece);
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
            const className = move.captureId ? 'tile-capture' : 'tile-move';
            highlightTile(move.q, move.r, className);
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
            tileEl.classList.remove('tile-selected', 'tile-move', 'tile-capture');
        });
        highlightedTiles.length = 0;
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

    function isCenterPawnSquare(piece) {
        const key = coordKey(piece.q, piece.r);
        return (
            piece.type === 'pawn' &&
            ((piece.color === 'white' && key === coordKey(0, 2)) ||
                (piece.color === 'black' && key === coordKey(0, -2)))
        );
    }

    function moveSelectedPieceTo(move) {
        const piece = piecesById.get(selectedPieceId ?? '');
        if (!piece) {
            return;
        }
        const fromKey = coordKey(piece.q, piece.r);
        boardOccupancy.delete(fromKey);

        if (move.captureId) {
            capturePiece(move.captureId);
        }

        piece.q = move.q;
        piece.r = move.r;
        piece.hasMoved = true;
        const destinationKey = coordKey(piece.q, piece.r);
        boardOccupancy.set(destinationKey, piece.id);
        updatePiecePosition(piece);
        clearSelection();
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
                const mirrored = { q: -q, r: -r };
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

        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'new-game-button';
        button.className = 'control-button';
        button.textContent = 'New Game';
        button.addEventListener('click', handleNewGameClick);

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

        controls.appendChild(button);
        controls.appendChild(select);
        return controls;
    }

    function handleNewGameClick() {
        const select = document.getElementById('new-game-select');
        const mode = select?.value ?? 'local';
        startNewGame(mode);
    }

    function handleNewGameSelection(event) {
        startNewGame(event.target.value);
    }

    function startNewGame(mode) {
        if (mode === 'local') {
            resetBoard();
        }
    }

    function resetPawnStartingSquares() {
        pawnStartingSquares.white.clear();
        pawnStartingSquares.black.clear();
    }

    function swapBlackRoyalPositions(pieces) {
        const blackKing = pieces.find(piece => piece.color === 'black' && piece.type === 'king');
        const blackQueen = pieces.find(piece => piece.color === 'black' && piece.type === 'queen');
        if (!blackKing || !blackQueen) {
            return;
        }
        const kingQ = blackKing.q;
        const kingR = blackKing.r;
        blackKing.q = blackQueen.q;
        blackKing.r = blackQueen.r;
        blackQueen.q = kingQ;
        blackQueen.r = kingR;
        [blackKing, blackQueen].forEach(piece => {
            piece.initialQ = piece.q;
            piece.initialR = piece.r;
        });
    }
})();
