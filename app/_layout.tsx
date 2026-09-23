import Constants from 'expo-constants'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Platform } from 'react-native'

if (Platform.OS !== 'web' && Constants.appOwnership !== 'expo') {
  const { registerGlobals } = require('@livekit/react-native')
  registerGlobals()
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
