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

    const boardContainer = document.createElement('div');
    boardContainer.id = 'board-container';

    const board = document.createElement('div');
    board.id = 'board';

    const tiles = buildTiles();
    sizeBoard(tiles);
    renderTiles(tiles);
    boardContainer.appendChild(board);
    appRoot.appendChild(boardContainer);

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
            tileElement.dataset.coord = `${tile.q}, ${tile.r}`;
            const offsetX = tile.x - minX + padding / 2;
            const offsetY = tile.y - minY + padding / 2;
            tileElement.style.left = `${offsetX}px`;
            tileElement.style.top = `${offsetY}px`;
            board.appendChild(tileElement);
        });
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
})();
