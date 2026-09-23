import { registerGlobals } from '@livekit/react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

registerGlobals()

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
