# Hexagonal Chess

A fully functional hexagonal chess web app built with pure JavaScript, featuring real-time multiplayer capabilities and bookmarklet support.

## 🎮 Features

- **Hexagonal Board**: 91-hex Gliński's standard hexagonal chess layout
- **Complete Game Rules**: All chess pieces adapted for hexagonal movement
- **Real-time Multiplayer**: Firebase integration for cross-network play
- **Bookmarklet Support**: Play on any webpage without leaving your current site
- **Responsive Design**: Works on desktop and mobile devices
- **Local Storage**: Save game progress locally
- **Modern UI**: Clean, intuitive interface with drag-and-drop support

## 🚀 Quick Start

### Play Online
1. Visit the [GitHub Pages deployment](https://lazypanda5050.github.io/Hexagonal-Chess/)
2. Click "Create Online Game" to host a game
3. Share the game ID with a friend
4. Or click "Join Online Game" and enter a game ID

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/Hexagonal-Chess.git
cd Hexagonal-Chess

# Start a local server
python3 -m http.server 8000
# or
npx serve .

# Open http://localhost:8000 in your browser
```

## 🎯 Game Rules

### Board Layout
- **91 hexagons** arranged in Gliński's hexagonal chess pattern
- **Coordinate system**: Axial coordinates (q, r) for each hex
- **Starting position**: Traditional chess setup adapted for hexagonal board

### Piece Movement
- **Pawns**: Move forward one hex, capture diagonally. Center pawn cannot move 2 spaces initially.
- **Rooks**: Move along straight lines on the hex grid
- **Knights**: L-shaped moves adapted for hexagonal geometry
- **Bishops**: Move along hexagonal diagonals
- **Queen**: Combines rook and bishop movement
- **King**: One hex in any direction

### Special Rules
- **Castling**: Modified for hexagonal board
  - Kingside: King replaces rook's position, rook moves left
  - Queenside: King replaces knight's position, rook moves right
- **En Passant**: Not available (removed due to center pawn rule)
- **Check/Checkmate**: Standard chess rules apply

## 🏗️ Architecture

### File Structure
```
Hexagonal-Chess/
├── index.html              # Main game page
├── bookmarklet.html        # Bookmarklet installation page
├── plan.md                 # Development plan
├── README.md               # This file
├── js/
│   ├── board.js           # Hexagonal board logic and rendering
│   ├── pieces.js          # Piece movement rules and validation
│   ├── game.js            # Game state management and flow
│   ├── validator.js       # Move validation and game rules
│   ├── firebase.js        # Firebase integration and real-time sync
│   └── bookmarklet.js     # Bookmarklet injector and floating window
├── css/
│   ├── board.css          # Hexagonal board styling
│   ├── pieces.css         # Chess piece styles and animations
│   └── ui.css             # UI components and responsive design
└── assets/
    ├── pieces/            # Chess piece images/SVGs
    └── icons/             # UI icons and graphics
```

### Core Classes

#### HexBoard
- Renders the hexagonal grid
- Handles coordinate system
- Manages hex selection and interaction

#### PieceManager
- Manages piece placement and movement
- Handles piece creation and rendering
- Tracks piece states

#### MoveValidator
- Validates legal moves
- Implements game rules
- Detects check/checkmate/stalemate

#### FirebaseManager
- Handles real-time synchronization
- Manages game rooms and players
- Provides fallback to local storage

#### HexChessGame
- Main game controller
- Coordinates all components
- Manages game flow and UI updates

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Realtime Database
3. Update the Firebase configuration in `js/firebase.js`:
```javascript
this.firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

### Customization
- **Board size**: Modify `hexSize` in `HexBoard` class
- **Piece styles**: Update CSS in `css/pieces.css`
- **Game rules**: Modify movement logic in `js/validator.js`

## 🌐 Deployment

### GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Select source branch (usually `main` or `gh-pages`)
4. Access at `https://username.github.io/Hexagonal-Chess/`

### Custom Domain
1. Add CNAME file to repository root
2. Configure DNS settings
3. Update GitHub Pages settings

## 🎮 Controls

### Mouse Controls
- **Click piece**: Select piece
- **Click hex**: Move selected piece
- **Drag piece**: Move piece (if implemented)
- **ESC**: Deselect piece

### Keyboard Shortcuts
- **ESC**: Deselect current piece
- **Ctrl+Z**: Undo last move (if available)

## 🐛 Troubleshooting

### Common Issues

#### Bookmarklet Not Working
- Ensure JavaScript is enabled
- Check browser's Content Security Policy
- Try on a different webpage
- Clear browser cache

#### Firebase Connection Issues
- Verify Firebase configuration
- Check internet connection
- Ensure Firebase project is active
- Check browser console for errors

#### Game Not Loading
- Check browser console for JavaScript errors
- Verify all files are accessible
- Try refreshing the page
- Check local server is running

### Browser Compatibility
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile**: Responsive design works on modern mobile browsers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Commit changes: `git commit -m 'Add feature'`
6. Push to branch: `git push origin feature-name`
7. Submit a pull request

### Development Guidelines
- Follow existing code style
- Add comments for complex logic
- Test on multiple browsers
- Update documentation as needed

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Based on Gliński's hexagonal chess variant
- Inspired by CGP Grey's hexagonal chess video
- Built with pure JavaScript (no frameworks)
- Firebase for real-time capabilities
- GitHub Pages for hosting

## 📞 Support

For issues, questions, or suggestions:
- Create an issue on GitHub
- Check existing issues for solutions
- Review documentation for common problems

---

**Enjoy playing hexagonal chess! 🎯♟️**
