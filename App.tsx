import React, { useState, useEffect } from 'react'
import { Platform, View } from 'react-native'
import { MazeGameScreen } from './src/screens/MazeGameScreen'

export default function App() {
  // On native, Skia is synchronous; on web we have to load CanvasKit WASM first.
  const [ready, setReady] = useState(Platform.OS !== 'web')

  useEffect(() => {
    if (Platform.OS !== 'web') return
    // Conditional require keeps canvaskit-wasm out of native bundles.
    const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/module/web')
    LoadSkiaWeb().then(() => setReady(true))
  }, [])

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#d4be95' }} />
  }

  return <MazeGameScreen />
}
