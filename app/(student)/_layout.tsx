import { Redirect, Tabs } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { supabase } from '@/lib/supabase'
import { colors, radius } from '@/constants/theme'

const icons = {
  inicio: '⌂',
  aulas: '▣',
  atividades: '✓',
  financeiro: '▤',
  mais: '○',
} as const

function TabIcon({ icon, color, focused }: { icon: string; color: string; focused: boolean }) {
  return (
    <Text style={[styles.icon, { color, fontWeight: focused ? '800' : '500' }]}>
      {icon}
    </Text>
  )
}

export default function StudentLayout() {
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setAuthenticated(Boolean(data.session))
      setChecking(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setAuthenticated(Boolean(session))
      setChecking(false)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  if (checking) {
    return <View style={styles.loading}><ActivityIndicator size="small" color={colors.primary} /></View>
  }

  if (!authenticated) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ color, focused }) => <TabIcon icon={icons.inicio} color={color} focused={focused} /> }} />
      <Tabs.Screen name="aulas" options={{ title: 'Aulas', tabBarIcon: ({ color, focused }) => <TabIcon icon={icons.aulas} color={color} focused={focused} /> }} />
      <Tabs.Screen name="atividades" options={{ title: 'Atividades', tabBarIcon: ({ color, focused }) => <TabIcon icon={icons.atividades} color={color} focused={focused} /> }} />
      <Tabs.Screen name="financeiro" options={{ title: 'Financeiro', tabBarIcon: ({ color, focused }) => <TabIcon icon={icons.financeiro} color={color} focused={focused} /> }} />
      <Tabs.Screen name="mais" options={{ title: 'Mais', tabBarIcon: ({ color, focused }) => <TabIcon icon={icons.mais} color={color} focused={focused} /> }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  tabBar: {
    height: 82,
    paddingTop: 9,
    paddingBottom: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 8,
  },
  label: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  item: { borderRadius: radius.md },
  icon: { fontSize: 22, lineHeight: 25 },
})
