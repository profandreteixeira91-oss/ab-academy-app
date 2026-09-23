import { Redirect, Tabs } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { supabase } from '@/lib/supabase'
import { colors, radius } from '@/constants/theme'

const tabs = {
  inicio: { icon: '⌂', label: 'Início' },
  aulas: { icon: '▣', label: 'Aulas' },
  atividades: { icon: '✓', label: 'Atividades' },
  financeiro: { icon: '▤', label: 'Financeiro' },
  mais: { icon: '•••', label: 'Mais' },
} as const

function TabIcon({
  icon,
  color,
  focused,
}: {
  icon: string
  color: string
  focused: boolean
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text
        style={[
          styles.icon,
          {
            color: focused ? colors.primary : color,
            fontWeight: focused ? '900' : '600',
          },
        ]}
      >
        {icon}
      </Text>
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
          title: tabs.inicio.label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={tabs.inicio.icon} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="aulas"
        options={{
          title: tabs.aulas.label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={tabs.aulas.icon} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="atividades"
        options={{
          title: tabs.atividades.label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={tabs.atividades.icon} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="financeiro"
        options={{
          title: tabs.financeiro.label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={tabs.financeiro.icon} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="mais"
        options={{
          title: tabs.mais.label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={tabs.mais.icon} color={color} focused={focused} />
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
  icon: {
    fontSize: 20,
    lineHeight: 23,
  },
})
