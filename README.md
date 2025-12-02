# Chupacabra Maze Game - React Native

A React Native maze game application converted from Android/Kotlin to a cross-platform React Native project.

## Features

- Interactive maze game with player movement
- Special actions: jump, wall breaking, teleportation
- Pause/resume functionality
- Reveal path option
- Cross-platform support (iOS, Android, Web)
- TypeScript support for type safety

## Project Structure

```
chupacabra/
├── src/
│   ├── game/
│   │   └── MazeGame.ts          # Core game logic
│   ├── screens/
│   │   └── MazeGameScreen.tsx   # Main game screen
│   ├── components/
│   │   ├── MazeCanvas.tsx       # Maze visualization
│   │   └── ControlPanel.tsx     # Game controls
│   └── theme/
│       └── Colors.ts            # Design tokens
├── android/                      # Android-specific code
├── App.tsx                       # Root component
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
├── babel.config.js               # Babel configuration
└── metro.config.js               # Metro configuration
```

## Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. For Android development:
```bash
npm run android
```

3. For iOS development:
```bash
npm run ios
```

4. For web development (with Expo):
```bash
npm run web
```

## Development

Start the development server:
```bash
npm start
```

This will start the Metro bundler. From there, you can:
- Press `a` to open in Android emulator
- Press `i` to open in iOS simulator
- Press `w` to open in web browser

## Game Controls

- **Movement**: Use directional buttons to move the player
- **Jump**: Jump 2 cells in a direction
- **Break Walls**: Break adjacent walls
- **Pause/Resume**: Toggle game pause state
- **Reveal Path**: Show/hide the solution path
- **Reset**: Restart the maze

## Technology Stack

- **React Native**: 0.73.0
- **TypeScript**: 5.2.0
- **Expo**: For simplified development
- **Android**: Native implementation

## Building for Production

### Android

```bash
cd android
./gradlew build
```

### iOS

```bash
cd ios
pod install
xcodebuild -workspace Chupacabra.xcworkspace -scheme Chupacabra -configuration Release
```

## Migration Notes

This project was converted from a Kotlin/Jetpack Compose Android application to React Native to enable:
- Cross-platform development (iOS, Android, Web)
- Code sharing between platforms
- Simplified deployment and updates
- Broader developer team compatibility

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for any bugs or feature requests.
