class HexBoard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.hexSize = 30;
        this.hexagons = new Map();
        this.selectedHex = null;
        this.pieces = new Map();
        
        // Generate hexagonal board coordinates programmatically
        this.hexCoordinates = this.generateHexBoard();
        
        this.init();
    }
    
    init() {
        this.createBoard();
        this.setupEventListeners();
    }
    
    generateHexBoard() {
        const coordinates = [];
        const boardRadius = 5; // Gliński hexagonal chess has radius 5
        
        for (let q = -boardRadius; q <= boardRadius; q++) {
            for (let r = -boardRadius; r <= boardRadius; r++) {
                const s = -q - r;
                if (Math.abs(s) <= boardRadius) {
                    coordinates.push({q, r});
                }
            }
        }
        
        return coordinates;
    }
    
    createBoard() {
        const boardElement = document.createElement('div');
        boardElement.className = 'hex-board';
        
        // Create hexagons using proper hexagonal coordinates
        this.hexCoordinates.forEach(coord => {
            const hex = this.createHexagon(coord.q, coord.r);
            boardElement.appendChild(hex);
        });
        
        this.container.appendChild(boardElement);
    }
    
    createHexagon(q, r) {
        const hex = document.createElement('div');
        hex.className = 'hexagon';
        hex.dataset.q = q;
        hex.dataset.r = r;
        
        // Use flat-top hexagon layout
        const size = 35;
        const width = size * 2;
        const height = Math.sqrt(3) * size;
        
        // Convert axial to pixel coordinates for flat-top hexagons
        const x = size * 3/2 * q;
        const y = size * Math.sqrt(3) * (r + q/2);
        
        // Center the board
        const centerX = 400;
        const centerY = 300;
        
        hex.style.left = `${centerX + x - width/2}px`;
        hex.style.top = `${centerY + y - height/2}px`;
        hex.style.width = `${width}px`;
        hex.style.height = `${height}px`;
        
        const inner = document.createElement('div');
        inner.className = 'hex-inner';
        hex.appendChild(inner);
        
        const coord = document.createElement('div');
        coord.className = 'hex-coords';
        coord.textContent = `${q},${r}`;
        inner.appendChild(coord);
        
        this.hexagons.set(`${q},${r}`, hex);
        
        hex.addEventListener('click', () => this.onHexClick(q, r));
        
        return hex;
    }
    
    onHexClick(q, r) {
        const hexKey = `${q},${r}`;
        const hex = this.hexagons.get(hexKey);
        
        if (this.selectedHex) {
            if (this.selectedHex === hexKey) {
                hex.classList.remove('selected');
                this.selectedHex = null;
            } else {
                this.movePiece(this.selectedHex, hexKey);
                this.hexagons.get(this.selectedHex).classList.remove('selected');
                this.selectedHex = null;
            }
        } else {
            hex.classList.add('selected');
            this.selectedHex = hexKey;
        }
    }
    
    movePiece(fromKey, toKey) {
        const piece = this.pieces.get(fromKey);
        if (piece) {
            this.pieces.delete(fromKey);
            this.pieces.set(toKey, piece);
            
            const fromHex = this.hexagons.get(fromKey);
            const toHex = this.hexagons.get(toKey);
            
            const pieceElement = fromHex.querySelector('.piece');
            if (pieceElement) {
                toHex.appendChild(pieceElement);
            }
        }
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.selectedHex) {
                    const hex = this.hexagons.get(this.selectedHex);
                    hex.classList.remove('selected');
                    this.selectedHex = null;
                }
            }
        });
    }
    
    getHexAt(q, r) {
        return this.hexagons.get(`${q},${r}`);
    }
    
    getPieceAt(q, r) {
        return this.pieces.get(`${q},${r}`);
    }
}