class FirebaseManager {
    constructor() {
        this.database = null;
        this.gameId = null;
        this.playerId = null;
        this.isHost = false;
        this.listeners = new Map();
        
        // Firebase configuration - replace with your actual config
        this.firebaseConfig = {
            apiKey: "your-api-key",
            authDomain: "hexagonal-chess.firebaseapp.com",
            databaseURL: "https://hexagonal-chess-default-rtdb.firebaseio.com",
            projectId: "hexagonal-chess",
            storageBucket: "hexagonal-chess.appspot.com",
            messagingSenderId: "123456789",
            appId: "1:123456789:web:abcdef"
        };
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize Firebase if not already initialized
            if (!window.firebase) {
                const script = document.createElement('script');
                script.src = 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js';
                document.head.appendChild(script);
                
                await new Promise(resolve => {
                    script.onload = resolve;
                });
                
                const databaseScript = document.createElement('script');
                databaseScript.src = 'https://www.gstatic.com/firebasejs/9.6.1/firebase-database-compat.js';
                document.head.appendChild(databaseScript);
                
                await new Promise(resolve => {
                    databaseScript.onload = resolve;
                });
            }
            
            if (!firebase.apps.length) {
                firebase.initializeApp(this.firebaseConfig);
            }
            this.database = firebase.database();
            
            // Generate or retrieve player ID
            this.playerId = localStorage.getItem('hexChessPlayerId') || 
                           this.generatePlayerId();
            localStorage.setItem('hexChessPlayerId', this.playerId);
            
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            // Fallback to local storage mode
            this.database = null;
        }
    }
    
    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }
    
    async createGame() {
        if (!this.database) {
            return this.createLocalGame();
        }
        
        this.gameId = 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        this.isHost = true;
        
        const gameData = {
            board: this.serializeBoard(),
            moves: [],
            players: {
                white: this.playerId,
                black: null
            },
            currentTurn: 'white',
            gameStatus: 'waiting',
            lastMove: Date.now(),
            createdAt: Date.now()
        };
        
        await this.database.ref('games/' + this.gameId).set(gameData);
        
        // Listen for game updates
        this.setupGameListener();
        
        return this.gameId;
    }
    
    async joinGame(gameId) {
        if (!this.database) {
            return false;
        }
        
        this.gameId = gameId;
        
        const gameRef = this.database.ref('games/' + gameId);
        const snapshot = await gameRef.once('value');
        const gameData = snapshot.val();
        
        if (!gameData) {
            throw new Error('Game not found');
        }
        
        if (gameData.players.black && gameData.players.black !== this.playerId) {
            throw new Error('Game is full');
        }
        
        // Join as black player if slot is available
        if (!gameData.players.black) {
            await gameRef.update({
                'players/black': this.playerId,
                'gameStatus': 'active'
            });
        }
        
        this.isHost = false;
        this.setupGameListener();
        
        return true;
    }
    
    createLocalGame() {
        this.gameId = 'local_' + Date.now();
        this.isHost = true;
        return this.gameId;
    }
    
    setupGameListener() {
        if (!this.database) return;
        
        const gameRef = this.database.ref('games/' + this.gameId);
        
        gameRef.on('value', (snapshot) => {
            const gameData = snapshot.val();
            if (gameData) {
                this.onGameUpdate(gameData);
            }
        });
        
        this.listeners.set('game', gameRef);
    }
    
    onGameUpdate(gameData) {
        // This will be overridden by the game instance
        if (this.onUpdateCallback) {
            this.onUpdateCallback(gameData);
        }
    }
    
    async makeMove(move) {
        if (!this.database) {
            return this.makeLocalMove(move);
        }
        
        const gameRef = this.database.ref('games/' + this.gameId);
        
        // Add move to history
        await gameRef.child('moves').push({
            ...move,
            timestamp: Date.now(),
            player: this.playerId
        });
        
        // Update game state
        await gameRef.update({
            board: move.boardState,
            currentTurn: move.nextTurn,
            gameStatus: move.gameStatus,
            lastMove: Date.now()
        });
    }
    
    makeLocalMove(move) {
        // Store move in localStorage for local multiplayer
        const moves = JSON.parse(localStorage.getItem('hexChessMoves') || '[]');
        moves.push(move);
        localStorage.setItem('hexChessMoves', JSON.stringify(moves));
        localStorage.setItem('hexChessBoard', JSON.stringify(move.boardState));
        localStorage.setItem('hexChessTurn', move.nextTurn);
    }
    
    serializeBoard() {
        // Serialize the current board state
        const pieces = [];
        // This would be implemented by the game class
        return pieces;
    }
    
    async getAvailableGames() {
        if (!this.database) {
            return [];
        }
        
        const gamesRef = this.database.ref('games');
        const snapshot = await gamesRef.once('value');
        const games = snapshot.val() || {};
        
        return Object.entries(games)
            .filter(([id, game]) => game.gameStatus === 'waiting')
            .map(([id, game]) => ({
                id,
                ...game
            }));
    }
    
    async leaveGame() {
        if (!this.database || !this.gameId) return;
        
        const gameRef = this.database.ref('games/' + this.gameId);
        
        if (this.isHost) {
            // Host leaving - delete the game
            await gameRef.remove();
        } else {
            // Player leaving - remove from players
            const snapshot = await gameRef.once('value');
            const gameData = snapshot.val();
            
            if (gameData) {
                if (gameData.players.white === this.playerId) {
                    await gameRef.update({
                        'players/white': null,
                        'gameStatus': 'abandoned'
                    });
                } else if (gameData.players.black === this.playerId) {
                    await gameRef.update({
                        'players/black': null,
                        'gameStatus': 'waiting'
                    });
                }
            }
        }
        
        // Remove listeners
        this.listeners.forEach(ref => ref.off());
        this.listeners.clear();
        
        this.gameId = null;
        this.isHost = false;
    }
    
    onUpdate(callback) {
        this.onUpdateCallback = callback;
    }
    
    isConnected() {
        return this.database !== null;
    }
    
    getPlayerColor() {
        if (!this.gameId) return null;
        
        // For local games, white is host
        if (!this.database) {
            return this.isHost ? 'white' : 'black';
        }
        
        // For online games, determine from game data
        // This would need to be implemented based on current game state
        return null;
    }
}