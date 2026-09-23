import { Redirect, Tabs } from 'expo-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function StudentLayout() {
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
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

  if (checking) return null

  if (!authenticated) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#111827',
        tabBarInactiveTintColor: '#98a2b3',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="aulas" options={{ title: 'Aulas' }} />
      <Tabs.Screen name="atividades" options={{ title: 'Atividades' }} />
      <Tabs.Screen name="financeiro" options={{ title: 'Financeiro' }} />
      <Tabs.Screen name="mais" options={{ title: 'Mais' }} />
    </Tabs>
  )
}
