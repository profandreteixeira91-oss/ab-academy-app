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
          <Text style={styles.eyebrow}>CONTA</Text>
          <Text style={styles.title}>Mais</Text>
          <Text style={styles.subtitle}>
            Seu perfil e opções da plataforma.
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>•••</Text>
        </View>
      </View>

      <AppCard elevated style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          <View style={styles.profileCopy}>
            <Text style={styles.profileLabel}>ALUNO</Text>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.email}>{email || 'Conta AB Academy'}</Text>
          </View>
        </View>

        <View style={styles.profileDivider} />

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
            <Text style={styles.actionSubtitle}>
              Consulte seus dados cadastrais.
            </Text>
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
          <View style={[styles.menuIcon, { backgroundColor: colors.primarySoft }]}>
            <Text style={styles.menuIconText}>?</Text>
          </View>

          <View style={styles.menuCopy}>
            <Text style={styles.menuTitle}>Minhas solicitações</Text>
            <Text style={styles.menuSubtitle}>
              Acompanhe pedidos e atendimentos.
            </Text>
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
        <Text style={styles.logoutText}>Sair da conta</Text>
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
    padding: spacing.xxl,
    paddingTop: 42,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  headerCopy: {
    flex: 1,
    paddingRight: spacing.lg,
  },
  eyebrow: {
    ...typography.overline,
    color: colors.textSecondary,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginTop: 6,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 6,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  profileCard: {
    marginBottom: spacing.xxl,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
  },
  profileCopy: {
    flex: 1,
  },
  profileLabel: {
    ...typography.overline,
    color: colors.textTertiary,
    fontSize: 9,
  },
  name: {
    ...typography.h3,
    color: colors.text,
    marginTop: 2,
  },
  email: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 3,
  },
  profileDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  profileAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionIconText: {
    color: colors.text,
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
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  menuItem: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuIconText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
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
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoutIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  logoutIconText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '800',
  },
  logoutText: {
    ...typography.bodyMedium,
    color: colors.danger,
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
