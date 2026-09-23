import { Redirect, Tabs } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { supabase } from '@/lib/supabase'

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
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  if (checking) return <View style={styles.loading}><ActivityIndicator size="large" /></View>
  if (!authenticated) return <Redirect href="/(auth)/login" />

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#111827', tabBarInactiveTintColor: '#98a2b3' }}>
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="aulas" options={{ title: 'Aulas' }} />
      <Tabs.Screen name="atividades" options={{ title: 'Atividades' }} />
      <Tabs.Screen name="financeiro" options={{ title: 'Financeiro' }} />
      <Tabs.Screen name="mais" options={{ title: 'Mais' }} />
    </Tabs>
  )
}
const styles = StyleSheet.create({ loading: { flex: 1, backgroundColor: '#f6f7fb', alignItems: 'center', justifyContent: 'center' } })
