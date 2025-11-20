class BookmarkletManager {
    constructor() {
        this.window = null;
        this.isInjected = false;
        this.originalGame = null;
    }
    
    inject() {
        if (this.isInjected) {
            this.showWindow();
            return;
        }
        
        // Create floating window
        this.createFloatingWindow();
        
        // Inject styles
        this.injectStyles();
        
        // Load game scripts
        this.loadGameScripts();
        
        this.isInjected = true;
    }
    
    createFloatingWindow() {
        // Create window container
        this.window = document.createElement('div');
        this.window.id = 'hex-chess-bookmarklet';
        this.window.innerHTML = `
            <div class="bookmarklet-header">
                <h3>Hexagonal Chess</h3>
                <div class="bookmarklet-controls">
                    <button id="minimize-btn">−</button>
                    <button id="close-btn">×</button>
                </div>
            </div>
            <div class="bookmarklet-content">
                <div id="bookmarklet-board" class="mini-board"></div>
                <div class="bookmarklet-sidebar">
                    <div class="mini-game-info">
                        <div class="turn">Turn: <span id="mini-turn">White</span></div>
                        <div class="status">Status: <span id="mini-status">Active</span></div>
                    </div>
                    <div class="mini-controls">
                        <button id="mini-new-game">New</button>
                        <button id="mini-undo">Undo</button>
                    </div>
                </div>
            </div>
        `;
        
        // Style the window
        this.window.style.cssText = `
            position: fixed;
            top: 50px;
            right: 50px;
            width: 500px;
            height: 400px;
            background: white;
            border: 2px solid #333;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            resize: both;
            overflow: auto;
            min-width: 300px;
            min-height: 250px;
        `;
        
        document.body.appendChild(this.window);
        
        // Make window draggable
        this.makeDraggable();
        
        // Setup event listeners
        this.setupBookmarkletEvents();
    }
    
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #hex-chess-bookmarklet .bookmarklet-header {
                background: #007bff;
                color: white;
                padding: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                border-radius: 8px 8px 0 0;
            }
            
            #hex-chess-bookmarklet .bookmarklet-header h3 {
                margin: 0;
                font-size: 16px;
            }
            
            #hex-chess-bookmarklet .bookmarklet-controls button {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                margin-left: 5px;
                padding: 0;
                width: 20px;
                height: 20px;
                border-radius: 50%;
            }
            
            #hex-chess-bookmarklet .bookmarklet-controls button:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            #hex-chess-bookmarklet .bookmarklet-content {
                display: flex;
                height: calc(100% - 50px);
            }
            
            #hex-chess-bookmarklet .mini-board {
                flex: 1;
                background: #f0f0f0;
                position: relative;
                overflow: hidden;
            }
            
            #hex-chess-bookmarklet .bookmarklet-sidebar {
                width: 150px;
                background: #f8f9fa;
                padding: 10px;
                border-left: 1px solid #dee2e6;
            }
            
            #hex-chess-bookmarklet .mini-game-info {
                margin-bottom: 15px;
                font-size: 12px;
            }
            
            #hex-chess-bookmarklet .mini-game-info div {
                margin-bottom: 5px;
            }
            
            #hex-chess-bookmarklet .mini-controls {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            #hex-chess-bookmarklet .mini-controls button {
                padding: 5px 10px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            }
            
            #hex-chess-bookmarklet .mini-controls button:hover {
                background: #0056b3;
            }
            
            #hex-chess-bookmarklet .hex-board {
                transform: scale(0.6);
                transform-origin: top left;
                width: 133%;
                height: 167%;
                position: absolute;
                top: 0;
                left: 0;
            }
            
            #hex-chess-bookmarklet .hexagon {
                width: 40px;
                height: 40px;
            }
            
            #hex-chess-bookmarklet .piece {
                font-size: 20px;
            }
            
            #hex-chess-bookmarklet.minimized {
                height: 50px !important;
                min-height: 50px !important;
            }
            
            #hex-chess-bookmarklet.minimized .bookmarklet-content {
                display: none;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    loadGameScripts() {
        // Check if game classes are already loaded
        if (typeof HexBoard !== 'undefined') {
            this.initializeGame();
            return;
        }
        
        // Load required scripts
        const scripts = [
            'https://your-domain.com/js/board.js',
            'https://your-domain.com/js/pieces.js',
            'https://your-domain.com/js/validator.js',
            'https://your-domain.com/js/game.js'
        ];
        
        let loadedScripts = 0;
        
        scripts.forEach(scriptUrl => {
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.onload = () => {
                loadedScripts++;
                if (loadedScripts === scripts.length) {
                    this.initializeGame();
                }
            };
            script.onerror = () => {
                console.error('Failed to load script:', scriptUrl);
            };
            document.head.appendChild(script);
        });
    }
    
    initializeGame() {
        // Initialize mini game
        this.originalGame = new HexChessGame('bookmarklet-board');
        
        // Override update methods to update mini UI
        this.originalGame.updateUI = () => this.updateMiniUI();
        
        // Setup mini controls
        document.getElementById('mini-new-game').onclick = () => {
            this.originalGame.newGame();
        };
        
        document.getElementById('mini-undo').onclick = () => {
            this.originalGame.undoMove();
        };
    }
    
    updateMiniUI() {
        if (!this.originalGame) return;
        
        const turnElement = document.getElementById('mini-turn');
        const statusElement = document.getElementById('mini-status');
        
        if (turnElement) {
            turnElement.textContent = this.originalGame.currentTurn.charAt(0).toUpperCase() + 
                                     this.originalGame.currentTurn.slice(1);
        }
        
        if (statusElement) {
            statusElement.textContent = this.originalGame.gameStatus.charAt(0).toUpperCase() + 
                                       this.originalGame.gameStatus.slice(1);
        }
    }
    
    makeDraggable() {
        const header = this.window.querySelector('.bookmarklet-header');
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = this.window.offsetLeft;
            initialY = this.window.offsetTop;
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        function onMouseMove(e) {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            this.window.style.left = (initialX + dx) + 'px';
            this.window.style.top = (initialY + dy) + 'px';
        }
        
        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }
    
    setupBookmarkletEvents() {
        // Close button
        document.getElementById('close-btn').addEventListener('click', () => {
            this.hideWindow();
        });
        
        // Minimize button
        document.getElementById('minimize-btn').addEventListener('click', () => {
            this.window.classList.toggle('minimized');
            const btn = document.getElementById('minimize-btn');
            btn.textContent = this.window.classList.contains('minimized') ? '+' : '−';
        });
    }
    
    showWindow() {
        if (this.window) {
            this.window.style.display = 'block';
        }
    }
    
    hideWindow() {
        if (this.window) {
            this.window.style.display = 'none';
        }
    }
    
    remove() {
        if (this.window) {
            this.window.remove();
        }
        this.isInjected = false;
        this.originalGame = null;
    }
}

// Create bookmarklet function
function launchHexChess() {
    if (!window.hexChessBookmarklet) {
        window.hexChessBookmarklet = new BookmarkletManager();
    }
    window.hexChessBookmarklet.inject();
}

// Auto-launch if URL parameter is present
if (window.location.search.includes('hexchess=1')) {
    document.addEventListener('DOMContentLoaded', launchHexChess);
}