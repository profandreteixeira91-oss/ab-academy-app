import { useEffect, useMemo, useState } from 'react'
import { Image, Platform, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { usePathname } from 'expo-router'
import { colors, fonts } from '@/constants/theme'

const LOGO_URL =
  'https://raw.githubusercontent.com/profandreteixeira91-oss/ab-academy/main/src/assets/logo_abacademy.png'

function getModuleName(pathname: string) {
  if (pathname.includes('/aulas')) return 'Aulas'
  if (pathname.includes('/atividades') || pathname.includes('/atividade/')) return 'Atividades'
  if (pathname.includes('/financeiro')) return 'Financeiro'
  if (pathname.includes('/mais')) return 'Mais'
  if (pathname.includes('/central')) return 'Central de Atividades'
  if (pathname.includes('/aula/')) return 'Sala de Aula'
  return 'Início'
}

export function StudentHeader() {
  const pathname = usePathname()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const moduleName = useMemo(() => getModuleName(pathname), [pathname])
  const date = now.toLocaleDateString('pt-BR')
  const time = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.logoArea}>
            <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.moduleArea}>
            <Text style={styles.moduleName} numberOfLines={1}>
              {moduleName}
            </Text>
          </View>

          <View style={styles.dateArea}>
            <Text style={styles.date}>{date}</Text>
            <Text style={styles.time}>{time}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  },
  header: {
    height: 68,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  logoArea: {
    width: 124,
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 42,
  },
  moduleArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  moduleName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  dateArea: {
    width: 74,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  date: {
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  time: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 1,
  },
})
