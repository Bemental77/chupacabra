# Migration Guide: Android to React Native

## Overview

This document outlines the conversion from the original Kotlin/Jetpack Compose Android application to React Native.

## Key Changes

### 1. **Project Structure**

**Before (Android/Gradle):**
```
app/
├── build.gradle.kts
├── src/main/
│   ├── AndroidManifest.xml
│   ├── java/com/example/chupacabra/
│   │   ├── MainActivity.kt
│   │   ├── game/MazeGame.kt
│   │   └── ui/
│   └── cpp/ (C++ JNI code)
└── res/ (XML resources)
```

**After (React Native):**
```
├── src/
│   ├── game/MazeGame.ts
│   ├── screens/MazeGameScreen.tsx
│   ├── components/
│   │   ├── MazeCanvas.tsx
│   │   └── ControlPanel.tsx
│   └── theme/Colors.ts
├── android/ (native Android layer)
└── App.tsx (root component)
```

### 2. **Language Migration**

**Kotlin → TypeScript/JavaScript**

#### Example: MazeGame class

**Kotlin:**
```kotlin
class MazeGame {
    var playerX by mutableStateOf(1)
        private set
    
    fun movePlayer(direction: Direction) {
        if (isPaused) return
        // ... movement logic
    }
}
```

**TypeScript:**
```typescript
export class MazeGame {
    private playerX: number = 1;
    
    movePlayer(direction: Direction): GameState {
        if (this.isPaused) return this.getState();
        // ... movement logic
    }
}
```

### 3. **UI Framework Migration**

**Jetpack Compose → React Native**

#### Example: UI Components

**Compose:**
```kotlin
Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
    Surface(
        modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding),
        color = MaterialTheme.colorScheme.background
    ) {
        MazeGameScreen()
    }
}
```

**React Native:**
```tsx
<SafeAreaView style={styles.container}>
  <View style={styles.header}>
    <Text style={styles.title}>Chupacabra Maze</Text>
  </View>
  <View style={styles.content}>
    <MazeCanvas {...props} />
    <ControlPanel {...props} />
  </View>
</SafeAreaView>
```

### 4. **State Management**

**Compose Mutable State → React Hooks**

**Before:**
```kotlin
var playerX by mutableStateOf(1)
var playerY by mutableStateOf(1)
```

**After:**
```typescript
const [gameState, setGameState] = useState<GameState>(
  game.getState()
);
```

### 5. **Build System**

**Gradle KTS → npm/package.json**

- All Android Gradle files remain in `android/` directory
- JavaScript dependencies managed via `package.json`
- Metro bundler used instead of Gradle for JS code

### 6. **Native Code Considerations**

The original C++ JNI code in `app/src/main/cpp/` has been removed:
- Game logic now runs in JavaScript/TypeScript
- No native rendering code needed (using React Native's rendering)

To add native modules in the future:
1. Use React Native's native module system
2. Create Java/Kotlin implementations in `android/app/src/main/java/com/chupacabra/`
3. Export through `TurboModules` or legacy `NativeModule` interface

### 7. **Dependencies**

**Android (Gradle):**
```kotlin
implementation("androidx.compose.ui:ui")
implementation("androidx.compose.material3:material3")
implementation("androidx.activity:activity-compose:1.8.2")
```

**React Native (npm):**
```json
{
  "react-native": "0.73.0",
  "react": "18.2.0",
  "react-native-screens": "^3.29.0"
}
```

## Development Workflow

### Running the App

1. **Development Mode:**
   ```bash
   npm start           # Start Metro bundler
   npm run android     # Run on Android emulator/device
   npm run ios         # Run on iOS simulator/device
   npm run web         # Run in web browser
   ```

2. **Building for Production:**
   ```bash
   # Android
   cd android
   ./gradlew build
   
   # iOS (requires macOS)
   cd ios
   xcodebuild build
   ```

### Debugging

- React Native Debugger for console and breakpoints
- Android Studio for native Android issues
- Xcode for iOS issues

## Performance Considerations

1. **JavaScript Threading**: Game logic runs on the JS thread
2. **Native Bridge**: Animations and rendering optimized through React Native
3. **Memory**: Monitor app memory usage, especially in maze rendering

## Testing

The new React Native project includes:
- Jest configuration for unit tests
- Test examples in `src/__tests__/`
- TypeScript type safety for better IDE support

Run tests:
```bash
npm test
```

## Future Enhancements

1. **Navigation**: Add React Navigation for multiple screens
2. **State Management**: Consider Redux/Zustand for complex state
3. **Animations**: Use React Native Reanimated for smooth transitions
4. **Native Modules**: Add native camera, sensors, or other device APIs
5. **PWA**: Deploy web version with offline support

## Troubleshooting

### Common Issues

**Metro bundler not starting:**
```bash
npm start -- --reset-cache
```

**Android build failures:**
```bash
cd android
./gradlew clean
./gradlew build
```

**Module not found errors:**
```bash
npm install
npm start -- --reset-cache
```

## Rollback Plan

If needed to revert to Android, the original Android project files remain:
- Original Kotlin code: `app/src/main/java/com/example/chupacabra/`
- Original Gradle configuration: `app/build.gradle.kts`

All React Native code is isolated in the new `src/` directory structure.
