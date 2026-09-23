import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { getStudentIdentity } from '@/lib/student'
import { supabase } from '@/lib/supabase'
import { AppCard } from '@/components/AppCard'
import { colors, radius, spacing, typography } from '@/constants/theme'

export default function MoreScreen() {
  const [name, setName] = useState('Aluno')
  const [email, setEmail] = useState('')

  useEffect(() => {
    getStudentIdentity()
      .then((identity) => {
        setName(identity.name)
        setEmail(identity.user.email || '')
      })
      .catch(() => undefined)
  }, [])

  async function signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      Alert.alert('Sair da conta', error.message)
      return
    }

    router.replace('/(auth)/login')
  }

  const initial = name.trim().charAt(0).toUpperCase() || 'A'

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>AB ACADEMY</Text>
          <Text style={styles.title}>Mais</Text>
          <Text style={styles.subtitle}>Perfil, suporte e configurações.</Text>
        </View>
      </View>

      <AppCard elevated style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          <View style={styles.profileCopy}>
            <Text style={styles.profileLabel}>ALUNO</Text>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.email} numberOfLines={1}>
              {email || 'Conta AB Academy'}
            </Text>
          </View>

          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>ATIVO</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.profileAction, pressed && styles.pressed]}
          onPress={() =>
            Alert.alert(
              'Meu perfil',
              'A edição do perfil será integrada na próxima etapa.'
            )
          }
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>↗</Text>
          </View>

          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>Meu perfil</Text>
            <Text style={styles.actionSubtitle}>Consultar dados cadastrais</Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </AppCard>

      <Text style={styles.sectionTitle}>Conta e suporte</Text>

      <View style={styles.menuCard}>
        <Pressable
          style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
          onPress={() =>
            Alert.alert(
              'Minhas solicitações',
              'O atendimento será integrado na próxima etapa.'
            )
          }
        >
          <View style={styles.menuIcon}>
            <Text style={styles.menuIconText}>?</Text>
          </View>

          <View style={styles.menuCopy}>
            <Text style={styles.menuTitle}>Minhas solicitações</Text>
            <Text style={styles.menuSubtitle}>Pedidos e atendimentos</Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Sessão</Text>

      <Pressable
        style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
        onPress={() => void signOut()}
      >
        <View style={styles.logoutIcon}>
          <Text style={styles.logoutIconText}>↪</Text>
        </View>
        <View style={styles.logoutCopy}>
          <Text style={styles.logoutText}>Sair da conta</Text>
          <Text style={styles.logoutSubtitle}>Encerrar sua sessão neste dispositivo</Text>
        </View>
        <Text style={styles.logoutChevron}>›</Text>
      </Pressable>

      <Text style={styles.version}>AB Academy • Portal do Aluno</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: 34,
    paddingBottom: 38,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    ...typography.overline,
    color: colors.primary,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginTop: 4,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 5,
  },
  profileCard: {
    padding: 18,
    marginBottom: 28,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.white,
    fontSize: 23,
    fontWeight: '800',
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileLabel: {
    ...typography.overline,
    color: colors.textTertiary,
    fontSize: 9,
  },
  name: {
    ...typography.h3,
    color: colors.text,
    marginTop: 1,
  },
  email: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  profileBadge: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginLeft: spacing.sm,
  },
  profileBadgeText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profileAction: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionIconText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  actionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  chevron: {
    fontSize: 28,
    lineHeight: 30,
    color: colors.borderStrong,
    marginLeft: spacing.sm,
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: 26,
    overflow: 'hidden',
  },
  menuItem: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuIconText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  menuCopy: {
    flex: 1,
  },
  menuTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  menuSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logout: {
    minHeight: 68,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F3C7C4',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  logoutIconText: {
    color: colors.danger,
    fontSize: 17,
    fontWeight: '800',
  },
  logoutCopy: {
    flex: 1,
  },
  logoutText: {
    ...typography.bodyMedium,
    color: colors.danger,
  },
  logoutSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  logoutChevron: {
    fontSize: 28,
    lineHeight: 30,
    color: '#E49B96',
    marginLeft: spacing.sm,
  },
  version: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  pressed: {
    opacity: 0.72,
  },
})
