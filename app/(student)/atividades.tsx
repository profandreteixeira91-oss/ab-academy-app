import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { getStudentId, formatBRDate } from '@/lib/student'
import { supabase } from '@/lib/supabase'
import { AppCard } from '@/components/AppCard'
import { colors, radius, spacing, typography } from '@/constants/theme'

type Activity = {
  id: string
  titulo: string
  descricao: string | null
  idioma: string
  status: string
  prazo: string | null
  nota: number | null
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'enviada':
      return 'Disponível'
    case 'em_andamento':
      return 'Em andamento'
    case 'respondida':
      return 'Respondida'
    case 'em_correcao':
      return 'Em correção'
    case 'corrigida':
      return 'Corrigida'
    default:
      return status.replaceAll('_', ' ')
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'corrigida':
      return { backgroundColor: colors.successSoft, color: colors.success }
    case 'respondida':
      return { backgroundColor: '#EFF6FF', color: colors.accent }
    case 'em_andamento':
      return { backgroundColor: colors.warningSoft, color: colors.warning }
    case 'em_correcao':
      return { backgroundColor: '#F5F3FF', color: '#7C3AED' }
    default:
      return { backgroundColor: colors.primarySoft, color: colors.textSecondary }
  }
}

function getLanguageLabel(idioma: string) {
  return idioma === 'ingles' ? 'Inglês' : 'Alemão'
}

export default function AtividadesScreen() {
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setError('')

      const id = await getStudentId()

      const { data, error: queryError } = await supabase
        .from('atividades')
        .select('id,titulo,descricao,idioma,status,prazo,nota')
        .eq('aluno_id', id)
        .neq('status', 'rascunho')
        .order('created_at', { ascending: false })

      if (queryError) throw queryError

      setItems(data ?? [])
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Não foi possível carregar suas atividades.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const pendingCount = useMemo(
    () => items.filter((item) => ['enviada', 'em_andamento'].includes(item.status)).length,
    [items]
  )

  const correctedCount = useMemo(
    () => items.filter((item) => item.status === 'corrigida').length,
    [items]
  )

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void load()
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>ATIVIDADES</Text>
          <Text style={styles.title}>Meu aprendizado</Text>
          <Text style={styles.subtitle}>
            Acompanhe suas atividades, respostas e resultados.
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>✓</Text>
        </View>
      </View>

      <AppCard elevated style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryLabel}>SEU DESEMPENHO</Text>
            <Text style={styles.summaryTitle}>
              {items.length} {items.length === 1 ? 'atividade' : 'atividades'}
            </Text>
          </View>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>ATUALIZADO</Text>
          </View>
        </View>

        <View style={styles.summaryStats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.stat}>
            <Text style={styles.statValue}>{correctedCount}</Text>
            <Text style={styles.statLabel}>Corrigidas</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.stat}>
            <Text style={styles.statValue}>{items.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </AppCard>

      {error ? (
        <View style={styles.error}>
          <Text style={styles.errorTitle}>Não foi possível atualizar</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Suas atividades</Text>
          <Text style={styles.sectionSubtitle}>
            Selecione uma atividade para continuar.
          </Text>
        </View>
      </View>

      {items.length === 0 ? (
        <AppCard elevated style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>✓</Text>
          </View>
          <Text style={styles.emptyTitle}>Nenhuma atividade disponível</Text>
          <Text style={styles.emptyText}>
            Quando seu professor enviar uma atividade, ela aparecerá aqui.
          </Text>
        </AppCard>
      ) : (
        items.map((item) => {
          const status = getStatusStyle(item.status)

          return (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: '/(student)/atividade/[id]',
                  params: { id: item.id },
                })
              }
              style={({ pressed }) => [
                styles.activityCard,
                pressed && styles.activityCardPressed,
              ]}
            >
              <View style={styles.cardTop}>
                <View style={styles.languageBadge}>
                  <Text style={styles.languageText}>
                    {getLanguageLabel(item.idioma)}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: status.backgroundColor }]}>
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>{item.titulo}</Text>

              {item.descricao ? (
                <Text style={styles.description} numberOfLines={2}>
                  {item.descricao}
                </Text>
              ) : null}

              <View style={styles.cardFooter}>
                {item.prazo ? (
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>PRAZO</Text>
                    <Text style={styles.metaValue}>{formatBRDate(item.prazo)}</Text>
                  </View>
                ) : (
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>PRAZO</Text>
                    <Text style={styles.metaValue}>Sem prazo definido</Text>
                  </View>
                )}

                {item.nota !== null ? (
                  <View style={styles.gradeBlock}>
                    <Text style={styles.metaLabel}>NOTA</Text>
                    <Text style={styles.gradeValue}>{item.nota}</Text>
                  </View>
                ) : (
                  <View style={styles.openButton}>
                    <Text style={styles.openButtonText}>Abrir</Text>
                    <Text style={styles.arrow}>›</Text>
                  </View>
                )}
              </View>
            </Pressable>
          )
        })
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
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
    fontSize: 23,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    marginBottom: spacing.xxl,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    ...typography.overline,
    color: '#AAB2C0',
  },
  summaryTitle: {
    ...typography.h2,
    color: colors.white,
    marginTop: 4,
  },
  summaryBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#293241',
  },
  summaryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#D0D5DD',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '800',
    color: colors.white,
  },
  statLabel: {
    ...typography.caption,
    color: '#AAB2C0',
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#3B4351',
    marginHorizontal: spacing.md,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#FECDCA',
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  errorTitle: {
    ...typography.bodyMedium,
    color: colors.danger,
  },
  errorText: {
    ...typography.caption,
    color: '#B42318',
    marginTop: 3,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    shadowColor: '#101828',
    shadowOpacity: 0.045,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  activityCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  languageBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  languageText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 11,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
    maxWidth: '58%',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    ...typography.caption,
    fontSize: 10,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    ...typography.overline,
    color: colors.textTertiary,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  metaValue: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  gradeBlock: {
    alignItems: 'flex-end',
  },
  gradeValue: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.success,
    marginTop: 1,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
  },
  openButtonText: {
    ...typography.caption,
    color: colors.text,
  },
  arrow: {
    fontSize: 19,
    lineHeight: 18,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyIconText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 300,
  },
})
