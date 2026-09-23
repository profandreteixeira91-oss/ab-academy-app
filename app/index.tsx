import { useEffect, useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { Redirect } from 'expo-router'
import { colors } from '../constants/theme'

const LOGO_URL =
  'https://raw.githubusercontent.com/profandreteixeira91-oss/ab-academy/main/src/assets/logo_abacademy.png'

export default function Index() {
  const [showApp, setShowApp] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowApp(true), 1800)
    return () => clearTimeout(timer)
  }, [])

  if (showApp) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Image
          source={{ uri: LOGO_URL }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.portal}>PORTAL DO ALUNO</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  brand: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 270,
    height: 130,
  },
  portal: {
    marginTop: 18,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: 2.4,
  },
})
