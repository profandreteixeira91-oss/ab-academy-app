import { Redirect, Tabs } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ColorValue, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { colors, radius } from '@/constants/theme'

const tabs = {
  inicio: { icon: 'home-outline', activeIcon: 'home' },
  aulas: { icon: 'calendar-outline', activeIcon: 'calendar' },
  atividades: { icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle' },
  financeiro: { icon: 'card-outline', activeIcon: 'card' },
  mais: { icon: 'menu-outline', activeIcon: 'menu' },
} as const

type TabIconName = keyof typeof tabs

function TabIcon({
  tab,
  color,
  focused,
}: {
  tab: TabIconName
  color: string | ColorValue
  focused: boolean
}) {
  const iconName = focused ? tabs[tab].activeIcon : tabs[tab].icon

  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons
        name={iconName}
        size={21}
        color={focused ? colors.primary : color}
      />
    </View>
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
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    )
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon tab="inicio" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="aulas"
        options={{
          title: 'Aulas',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon tab="aulas" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="atividades"
        options={{
          title: 'Atividades',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon tab="atividades" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="financeiro"
        options={{
          title: 'Financeiro',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon tab="financeiro" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="central"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="central/atividade/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="atividade/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="aula/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="mais"
        options={{
          title: 'Mais',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon tab="mais" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  tabBar: {
    height: 88,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -5 },
  },
  label: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  item: {
    borderRadius: radius.lg,
    paddingVertical: 2,
  },
  iconWrap: {
    width: 42,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  iconWrapActive: {
    backgroundColor: colors.primarySoft,
  },
})
