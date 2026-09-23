import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { getStudentId, formatBRDate } from '@/lib/student'
import { supabase } from '@/lib/supabase'
import { AppCard } from '@/components/AppCard'
import { colors, radius, spacing, typography } from '@/constants/theme'

type Entry = {
  id: string
  competencia: string
  data_vencimento: string
  data_pagamento: string | null
  valor: number
  status: string
  metodo_pagamento: string | null
  numero_parcela: number | null
  total_parcelas: number | null
}

function getStatus(status: string) {
  const normalized = status.toLowerCase()

  if (['pago', 'paid', 'quitado', 'recebido'].includes(normalized)) {
    return {
      label: 'Pago',
      backgroundColor: colors.successSoft,
      color: colors.success,
    }
  }

  if (['vencido', 'atrasado', 'overdue'].includes(normalized)) {
    return {
      label: 'Vencido',
      backgroundColor: colors.dangerSoft,
      color: colors.danger,
    }
  }

  if (['pendente', 'aberto', 'pending'].includes(normalized)) {
    return {
      label: 'Pendente',
      backgroundColor: colors.warningSoft,
      color: colors.warning,
    }
  }

  return {
    label: status,
    backgroundColor: colors.primarySoft,
    color: colors.textSecondary,
  }
}

export default function FinanceiroScreen() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setError('')

      const id = await getStudentId()

      const { data, error: queryError } = await supabase
        .from('mensalidades')
        .select(
          'id,competencia,data_vencimento,data_pagamento,valor,status,metodo_pagamento,numero_parcela,total_parcelas'
        )
        .eq('aluno_id', id)
        .order('data_vencimento', { ascending: false })

      if (queryError) throw queryError

      setEntries(
        (data ?? []).map((entry) => ({
          ...entry,
          valor: Number(entry.valor) || 0,
        }))
      )
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Não foi possível carregar seu financeiro.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const summary = useMemo(() => {
    const paid = entries
      .filter((entry) => ['pago', 'paid', 'quitado', 'recebido'].includes(entry.status.toLowerCase()))
      .reduce((total, entry) => total + entry.valor, 0)

    const pending = entries
      .filter((entry) => ['pendente', 'aberto', 'pending'].includes(entry.status.toLowerCase()))
      .reduce((total, entry) => total + entry.valor, 0)

    const overdue = entries
      .filter((entry) => ['vencido', 'atrasado', 'overdue'].includes(entry.status.toLowerCase()))
      .reduce((total, entry) => total + entry.valor, 0)

    return { paid, pending, overdue }
  }, [entries])

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
          <Text style={styles.eyebrow}>FINANCEIRO</Text>
          <Text style={styles.title}>Minha conta</Text>
          <Text style={styles.subtitle}>
            Acompanhe mensalidades, vencimentos e pagamentos.
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>R$</Text>
        </View>
      </View>

      <AppCard elevated style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>VISÃO GERAL</Text>
        <Text style={styles.summaryTitle}>Seu financeiro</Text>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              R$ {summary.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.summaryItemLabel}>Em aberto</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              R$ {summary.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.summaryItemLabel}>Pagos</Text>
          </View>
        </View>

        {summary.overdue > 0 ? (
          <View style={styles.overdueNotice}>
            <View style={styles.noticeDot} />
            <Text style={styles.noticeText}>
              R$ {summary.overdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em pagamentos vencidos
            </Text>
          </View>
        ) : (
          <View style={styles.clearNotice}>
            <Text style={styles.clearNoticeIcon}>✓</Text>
            <Text style={styles.clearNoticeText}>Nenhum pagamento vencido</Text>
          </View>
        )}
      </AppCard>

      {error ? (
        <View style={styles.error}>
          <Text style={styles.errorTitle}>Não foi possível atualizar</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Histórico financeiro</Text>
          <Text style={styles.sectionSubtitle}>
            {entries.length} {entries.length === 1 ? 'lançamento' : 'lançamentos'}
          </Text>
        </View>
      </View>

      {entries.length === 0 ? (
        <AppCard elevated style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>R$</Text>
          </View>
          <Text style={styles.emptyTitle}>Nenhuma mensalidade encontrada</Text>
          <Text style={styles.emptyText}>
            Seu histórico financeiro aparecerá aqui quando houver lançamentos.
          </Text>
        </AppCard>
      ) : (
        entries.map((entry) => {
          const status = getStatus(entry.status)

          return (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View style={styles.entryTitleBlock}>
                  <Text style={styles.entryLabel}>COMPETÊNCIA</Text>
                  <Text style={styles.entryTitle}>{entry.competencia}</Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: status.backgroundColor }]}>
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.value}>
                R$ {entry.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>

              <View style={styles.details}>
                <View style={styles.detail}>
                  <Text style={styles.detailLabel}>VENCIMENTO</Text>
                  <Text style={styles.detailValue}>
                    {formatBRDate(entry.data_vencimento)}
                  </Text>
                </View>

                {entry.data_pagamento ? (
                  <View style={styles.detail}>
                    <Text style={styles.detailLabel}>PAGAMENTO</Text>
                    <Text style={styles.detailValue}>
                      {formatBRDate(entry.data_pagamento)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {entry.numero_parcela && entry.total_parcelas ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Parcela</Text>
                  <Text style={styles.infoValue}>
                    {entry.numero_parcela}/{entry.total_parcelas}
                  </Text>
                </View>
              ) : null}

              {entry.metodo_pagamento ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Método de pagamento</Text>
                  <Text style={styles.infoValue}>{entry.metodo_pagamento}</Text>
                </View>
              ) : null}
            </View>
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
    fontSize: 13,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    marginBottom: spacing.xxl,
  },
  summaryLabel: {
    ...typography.overline,
    color: '#AAB2C0',
  },
  summaryTitle: {
    ...typography.h2,
    color: colors.white,
    marginTop: 3,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  summaryItem: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    color: colors.white,
  },
  summaryItemLabel: {
    ...typography.caption,
    color: '#AAB2C0',
    marginTop: 3,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#3B4351',
    marginHorizontal: spacing.md,
  },
  overdueNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34272A',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: spacing.xl,
  },
  noticeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F97066',
    marginRight: spacing.sm,
  },
  noticeText: {
    flex: 1,
    ...typography.caption,
    color: '#FDA29B',
  },
  clearNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  clearNoticeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#293F35',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '800',
    color: '#6CE9A6',
    marginRight: spacing.sm,
  },
  clearNoticeText: {
    ...typography.caption,
    color: '#AAB2C0',
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
  entryCard: {
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
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryTitleBlock: {
    flex: 1,
  },
  entryLabel: {
    ...typography.overline,
    color: colors.textTertiary,
    fontSize: 9,
  },
  entryTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginLeft: spacing.sm,
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
  value: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.lg,
  },
  details: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  detail: {
    flex: 1,
  },
  detailLabel: {
    ...typography.overline,
    color: colors.textTertiary,
    fontSize: 9,
  },
  detailValue: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  infoValue: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    maxWidth: '55%',
    textAlign: 'right',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyIconText: {
    fontSize: 15,
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
