import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter'
import Constants from 'expo-constants'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Image, Platform, StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from '@/constants/theme'

if (Platform.OS !== 'web' && Constants.appOwnership !== 'expo') {
  const { registerGlobals } = require('@livekit/react-native')
  registerGlobals()
}

SplashScreen.preventAutoHideAsync().catch(() => {})

const LOGO_URL = 'https://raw.githubusercontent.com/profandreteixeira91-oss/ab-academy/main/src/assets/logo_abacademy.png'

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  })

  const [showLaunch, setShowLaunch] = useState(true)

  useEffect(() => {
    if (!fontsLoaded && !fontError) return

    SplashScreen.hideAsync().catch(() => {})

    const timer = setTimeout(() => setShowLaunch(false), 1100)
    return () => clearTimeout(timer)
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <>
      <StatusBar style={showLaunch ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
      {showLaunch ? (
        <View style={styles.launch}>
          <View style={styles.glow} />
          <View style={styles.logoCircle}>
            <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.portalTitle}>PORTAL DO ALUNO</Text>
          <View style={styles.accentLine} />
          <Text style={styles.tagline}>APRENDER. EVOLUIR. CONQUISTAR.</Text>
          <Text style={styles.footer}>AB ACADEMY</Text>
        </View>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  launch: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#081A33',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(23, 105, 209, 0.18)',
    top: '28%',
  },
  logoCircle: {
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  portalTitle: {
    marginTop: 30,
    fontFamily: fonts.extraBold,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: colors.white,
    textAlign: 'center',
  },
  accentLine: {
    width: 42,
    height: 2,
    marginTop: 15,
    marginBottom: 15,
    borderRadius: 2,
    backgroundColor: '#4A90E2',
  },
  tagline: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.7,
    color: '#D9E8FF',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 34,
    fontFamily: fonts.semibold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.4,
    color: '#7890AD',
  },
})
