# Getting Started with React Native Conversion

## 🎉 Congratulations!

Your Android project has been successfully converted to React Native. Here's what to do next:

## 📋 Quick Start

### 1. Install Node.js (if not already installed)
Download and install Node.js from https://nodejs.org/ (v16 or higher recommended)

### 2. Install Dependencies
```bash
cd c:\Users\casey.bement\dev\chupacbra
npm install
```

This will install all JavaScript dependencies listed in `package.json`.

### 3. Install Android SDK (if needed)
For Android development, ensure you have:
- Android SDK installed
- Android emulator or physical device connected
- ANDROID_HOME environment variable set

### 4. Run the Development Server
```bash
npm start
```

This starts the Metro bundler. You'll see a menu:
```
› Press a to open Android
› Press i to open iOS
› Press w to open web
› Press r to reload
› Press s to stop
```

### 5. Build for Specific Platform

#### Android
```bash
npm run android
```

#### iOS (macOS only)
```bash
npm run ios
```

#### Web
```bash
npm run web
```

## 📁 What's New

### JavaScript/TypeScript Code (new)
- `src/` - All React Native source code
- `App.tsx` - Root component
- `index.js` - Entry point

### Configuration Files (new)
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `babel.config.js` - JavaScript transpilation
- `metro.config.js` - Metro bundler config
- `.eslintrc.json` - Code linting rules
- `app.json` - Expo configuration

### Android Code (updated)
- `android/` - Native Android integration
- Updated manifest and build files
- React Native Java/Kotlin classes

### Documentation (new)
- `README.md` - Project overview
- `MIGRATION.md` - Detailed conversion guide
- `CONVERSION_SUMMARY.md` - What was converted
- `GETTING_STARTED.md` - This file!

## 🎮 Testing the App

### UI Components
- **MazeCanvas** - Displays the maze
- **ControlPanel** - Game controls UI
- **MazeGameScreen** - Main game screen

### Game Features
- ✅ Player movement (up, down, left, right)
- ✅ Jump action
- ✅ Wall breaking
- ✅ Teleportation
- ✅ Pause/resume
- ✅ Path revealing
- ✅ Game reset

Try all these controls on startup!

## 🧪 Run Tests

```bash
npm test
```

This runs Jest tests in `src/__tests__/`

## 📱 Development Tips

### Hot Reloading
- **Save and refresh**: Changes appear automatically
- **Full reload**: Press `r` in the Metro menu

### Debugging
- Android Studio for native issues
- React Native Debugger for JavaScript
- Console logs via `console.log()`

### Common Issues

**Port 8081 already in use:**
```bash
npm start -- --port 8082
```

**Clear cache and rebuild:**
```bash
npm start -- --reset-cache
```

**Android build issues:**
```bash
cd android
./gradlew clean
./gradlew build
cd ..
npm run android
```

## 📚 File Structure Explained

```
chupacabra/
├── src/
│   ├── __tests__/           # Jest test files
│   │   ├── setup.ts         # Jest configuration
│   │   └── MazeGame.test.ts # Game logic tests
│   ├── components/          # Reusable React components
│   │   ├── MazeCanvas.tsx   # Maze rendering
│   │   └── ControlPanel.tsx # Game controls
│   ├── game/                # Game logic (TypeScript)
│   │   └── MazeGame.ts      # Core game engine
│   ├── screens/             # Full screen components
│   │   └── MazeGameScreen.tsx
│   └── theme/               # Design system
│       └── Colors.ts        # Colors and typography
├── android/                 # Native Android code
│   ├── app/
│   │   ├── src/
│   │   │   └── main/
│   │   │       ├── java/     # Java/Kotlin files
│   │   │       └── res/      # Android resources
│   │   └── build.gradle      # App-level config
│   ├── build.gradle          # Project-level config
│   └── settings.gradle       # Gradle settings
├── App.tsx                  # Root component
├── index.js                 # Entry point
├── package.json             # NPM dependencies
├── app.json                 # Expo configuration
├── tsconfig.json            # TypeScript settings
├── babel.config.js          # Babel transpiler
├── metro.config.js          # Metro bundler
├── .eslintrc.json           # ESLint rules
├── README.md                # Project docs
├── MIGRATION.md             # Migration guide
├── CONVERSION_SUMMARY.md    # What was converted
└── GETTING_STARTED.md       # This file

```

## 🔄 Original Android Project

The original Android project files are still available:
- `app/src/main/java/com/example/chupacabra/` - Original Kotlin code
- `app/build.gradle.kts` - Original Gradle config
- `app/src/main/cpp/` - Original C++ code

You can refer to these for reference or revert if needed.

## 🚀 Next Steps

1. **Install dependencies**: `npm install`
2. **Start development**: `npm start`
3. **Run on Android**: `npm run android`
4. **Explore the code**: Check `src/` directory
5. **Make changes**: Edit components and see live reloading
6. **Run tests**: `npm test`
7. **Build for production**: See README.md

## 📖 Additional Resources

- **React Native Docs**: https://reactnative.dev/
- **Expo Docs**: https://docs.expo.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **React Docs**: https://react.dev/

## ❓ Troubleshooting

### App crashes on startup
1. Check console for error messages
2. Run `npm start -- --reset-cache`
3. Check that all dependencies are installed: `npm install`

### Metro bundler errors
```bash
npm start -- --reset-cache
```

### Android emulator not found
1. Open Android Studio
2. Go to Tools → Device Manager
3. Create a new virtual device
4. Run `npm run android`

### TypeScript errors
1. Check `tsconfig.json`
2. Make sure all types are installed: `npm install`
3. Restart your IDE

## 🤝 Getting Help

If you encounter issues:
1. Check the `MIGRATION.md` file for detailed conversion notes
2. Read the `README.md` for project overview
3. Check React Native docs at https://reactnative.dev/
4. Review error messages carefully

---

**Ready to go!** 🎉

Run `npm install` and then `npm start` to begin development.
