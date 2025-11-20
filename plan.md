# Hexagonal Chess Web App - Development Plan

## Project Overview

A hexagonal chess web app built with pure JavaScript, similar to yap window architecture. Uses Firebase Realtime Database for cross-network move tracking and GitHub Pages for deployment. No backend server required - everything runs client-side.

## Core Requirements

### Game Rules (Based on CGP Grey video with modifications)

- **Hexagonal board**: Standard hexagonal chess layout
- **Pawns**: Capture diagonally
- **Center pawn**: Starts one behind, cannot move 2 spaces
- **En passant**: Removed due to center pawn rule change
- **Castling**:
  - Kingside: King replaces rook's position, rook moves to the left
  - Queenside: King replaces knight's position, rook moves to the right
- **Coordinates**: Added for move notation and board reference

### Technical Requirements

- **Pure JavaScript**: No frameworks, similar to yap window implementation
- **Firebase Realtime Database**: For move storage and cross-network capability
- **GitHub Pages**: Deployment platform
- **Client-side only**: No backend server needed
- **Bookmarklet access**: Injectable script for any webpage
- **Local storage**: Board position and move tracking

## Architecture

### File Structure

```text
hexagonal-chess/
├── index.html              # Main game page
├── plan.md                 # This development plan
├── js/
│   ├── board.js           # Hexagonal board logic and rendering
│   ├── pieces.js          # Piece movement rules and validation
│   ├── game.js            # Game state management and flow
│   ├── firebase.js        # Firebase integration and real-time sync
│   ├── ui.js              # User interface interactions
│   ├── storage.js         # Local storage management
│   └── bookmarklet.js     # Bookmarklet injector and floating window
├── css/
│   ├── board.css          # Hexagonal board styling
│   ├── pieces.css         # Chess piece styles and animations
│   └── ui.css             # UI components and responsive design
├── assets/
│   ├── pieces/            # Chess piece images/SVGs
│   └── icons/             # UI icons and graphics
└── bookmarklet.html       # Bookmarklet installation and usage page
```

## Development Phases

### Phase 1: Core Board & Foundation

**Objective**: Create the hexagonal board and basic piece system

#### Tasks:

1. **Hexagonal Grid System**
   - Implement hexagonal grid layout (91 hexes - Gliński's standard)
   - Create coordinate system for hex positions
   - Develop hex rendering with CSS/SVG
   - Add hover effects and visual feedback

2. **Chess Pieces**
   - Design/create piece graphics (SVG preferred for scalability)
   - Implement piece placement on board
   - Create piece rendering system
   - Add piece identification and ownership

3. **Basic Movement**
   - Implement click-to-select and click-to-move
   - Add visual move indicators
   - Create basic piece lifting/placing animations
   - Implement coordinate display system

**Deliverables**:

- Functional hexagonal board
- All pieces properly placed
- Basic piece movement
- Coordinate system working

### Phase 2: Game Logic & Rules

**Objective**: Implement complete chess rules for hexagonal board

#### Tasks:

1. **Piece Movement Validation**
   - Pawn movement (including special center pawn rule)
   - Rook movement (straight lines on hex grid)
   - Knight movement (hex-adapted L-shapes)
   - Bishop movement (diagonal on hex grid)
   - Queen movement (combination of rook + bishop)
   - King movement (one hex in any direction)

2. **Special Rules Implementation**
   - Pawn capture mechanics (diagonal)
   - Castling logic (kingside and queenside variants)
   - Check and checkmate detection
   - Stalemate detection
   - En passant removal confirmation

3. **Game Flow Management**
   - Turn system (white/black alternation)
   - Move history tracking
   - Game state management
   - Legal move highlighting

**Deliverables**:

- Complete rule implementation
- Legal move validation
- Check/checkmate detection
- Turn management system

### Phase 3: Firebase Integration & Multiplayer

**Objective**: Add real-time synchronization and multiplayer capabilities

#### Tasks:

1. **Firebase Setup**
   - Configure Firebase project settings
   - Set up Realtime Database structure
   - Implement authentication (anonymous or simple)
   - Create game room system

2. **Real-time Synchronization**
   - Move broadcasting to Firebase
   - Real-time board state updates
   - Player presence detection
   - Game reconnection handling

3. **Multi-game Support**
   - Game creation and joining
   - Game list/lobby system
   - Spectator mode
   - Game persistence across sessions

**Deliverables**:

- Real-time move synchronization
- Multi-game support
- Player presence system
- Game persistence

### Phase 4: UI Polish & User Experience

**Objective**: Refine interface and implement bookmarklet system

#### Tasks:

1. **Advanced UI Features**
   - Drag and drop piece movement
   - Move history display
   - Captured pieces display
   - Game status indicators
   - Responsive design for mobile

2. **Bookmarklet System**
   - Create bookmarklet injector script
   - Implement floating game window
   - Add window positioning and resizing
   - Ensure bookmarklet works on any webpage

3. **Local Storage Integration**
   - Board position persistence
   - Offline move tracking
   - Settings storage
   - Game resume capability

**Deliverables**:

- Polished UI with drag-and-drop
- Working bookmarklet system
- Local storage integration
- Mobile-responsive design

### Phase 5: Deployment & Documentation

**Objective**: Deploy to GitHub Pages and create documentation

#### Tasks:

1. **GitHub Pages Setup**
   - Configure repository for GitHub Pages
   - Optimize assets for web delivery
   - Set up custom domain (if desired)
   - Test deployment functionality

2. **Documentation**
   - Update README with usage instructions
   - Create bookmarklet installation guide
   - Document game rules and controls
   - Add troubleshooting section

3. **Final Testing**
   - Cross-browser compatibility testing
   - Mobile device testing
   - Performance optimization
   - Bug fixes and polish

**Deliverables**:

- Fully deployed web app
- Complete documentation
- Cross-platform compatibility
- Performance optimization

## Technical Specifications

### Board Specifications

- **Hexagon count**: 91 (standard Gliński hexagonal chess)
- **Board shape**: Hexagonal with 6-sided symmetry
- **Coordinate system**: Axial or cube coordinates for hex grid
- **Visual style**: Clean, modern design with clear piece differentiation

### Firebase Data Structure

```javascript
{
  "games": {
    "gameId": {
      "board": "current board state",
      "moves": ["move history"],
      "players": {
        "white": "playerId",
        "black": "playerId"
      },
      "currentTurn": "white",
      "gameStatus": "active",
      "lastMove": "timestamp"
    }
  },
  "players": {
    "playerId": {
      "name": "playerName",
      "currentGame": "gameId",
      "status": "online"
    }
  }
}
```

### Bookmarklet Structure

```javascript
javascript:(function(){
  // Inject CSS
  // Create floating window
  // Load game scripts
  // Initialize game
})();
```

## Success Criteria

1. **Functional hexagonal chess game** with all rules implemented
2. **Real-time multiplayer** through Firebase
3. **Working bookmarklet** that can be used on any webpage
4. **Clean, intuitive UI** with drag-and-drop functionality
5. **Mobile-responsive** design
6. **Successful GitHub Pages deployment**
7. **Complete documentation** for users and developers



## Next Steps

1. Set up Firebase project and get configuration details
2. Create initial repository structure
3. Begin Phase 1 development with hexagonal board implementation
4. Test and iterate on board rendering and coordinate system