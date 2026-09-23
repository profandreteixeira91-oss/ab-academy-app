import { useCallback, useEffect, useState } from 'react'
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
import {
  canEnterLesson,
  formatBRDate,
  getNextLessonOccurrence,
  getStudentId,
} from '@/lib/student'
import { supabase } from '@/lib/supabase'
import { AppCard } from '@/components/AppCard'
import { colors, radius, shadow, spacing, typography } from '@/constants/theme'

type Lesson = {
  id: string
  language: string
  date: string
  time: string
  teacher: string
  startAt: string
  endAt: string
  meetUrl?: string
}

export default function AulasScreen() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setError('')

      const studentId = await getStudentId()

      const { data, error: queryError } = await supabase
        .from('horarios')
        .select('id, idioma, dia_semana, hora_inicio, hora_fim, professor_id, meet_url')
        .eq('aluno_id', studentId)

      if (queryError) throw queryError

      const ids = Array.from(
        new Set((data ?? []).map((item) => item.professor_id).filter(Boolean)),
      )

      const { data: professors, error: professorError } = ids.length
        ? await supabase.from('professores').select('id, nome_completo').in('id', ids)
        : { data: [], error: null }

      if (professorError) throw professorError

      const professorMap = new Map(
        (professors ?? []).map((professor) => [professor.id, professor.nome_completo]),
      )

      const mappedLessons = (data ?? [])
        .map((item) => {
          const { startAt, endAt } = getNextLessonOccurrence(
            Number(item.dia_semana),
            item.hora_inicio,
            item.hora_fim,
          )

          return {
            id: item.id,
            language: item.idioma === 'ingles' ? 'Inglês' : 'Alemão',
            date: formatBRDate(startAt.toISOString()),
            time: item.hora_inicio.slice(0, 5),
            teacher: professorMap.get(item.professor_id) || 'Professor',
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            meetUrl: item.meet_url || undefined,
          }
        })
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

      setLessons(mappedLessons)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar suas aulas.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando sua agenda...</Text>
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
        <Text style={styles.eyebrow}>AGENDA</Text>
        <Text style={styles.title}>Minhas aulas</Text>
        <Text style={styles.subtitle}>Sua programação semanal em um só lugar.</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryIcon}>
          <Text style={styles.summaryIconText}>▣</Text>
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryNumber}>{lessons.length}</Text>
          <Text style={styles.summaryLabel}>aulas na sua agenda</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.error}>
          <Text style={styles.errorTitle}>Não foi possível atualizar</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {lessons.length === 0 ? (
        <AppCard elevated style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>+</Text>
          </View>
          <Text style={styles.emptyTitle}>Nenhuma aula agendada</Text>
          <Text style={styles.emptyText}>
            Quando uma aula for agendada para você, ela aparecerá aqui.
          </Text>
        </AppCard>
      ) : (
        <View style={styles.list}>
          {lessons.map((lesson, index) => {
            const ready = canEnterLesson(lesson.startAt, lesson.endAt)

            return (
              <AppCard key={lesson.id} elevated style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.languageBadge}>
                    <Text style={styles.languageBadgeText}>{lesson.language}</Text>
                  </View>
                  <View style={[styles.statusBadge, ready ? styles.readyBadge : styles.waitingBadge]}>
                    <View style={[styles.statusDot, ready ? styles.readyDot : styles.waitingDot]} />
                    <Text style={[styles.statusText, ready ? styles.readyText : styles.waitingText]}>
                      {ready ? 'Disponível' : 'Agendada'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.date}>{lesson.date}</Text>
                <Text style={styles.time}>{lesson.time}</Text>

                <View style={styles.teacherRow}>
                  <View style={styles.teacherAvatar}>
                    <Text style={styles.teacherInitial}>
                      {lesson.teacher.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.teacherLabel}>Professor</Text>
                    <Text style={styles.teacher}>{lesson.teacher}</Text>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    !ready && styles.buttonDisabled,
                    pressed && ready && styles.buttonPressed,
                  ]}
                  disabled={!ready}
                  onPress={() =>
                    router.push({
                      pathname: '/(student)/aula/[id]',
                      params: { id: lesson.id },
                    })
                  }
                >
                  <Text style={styles.buttonText}>
                    {ready ? 'Entrar na aula' : 'Acesso liberado 5 min antes'}
                  </Text>
                  {ready ? <Text style={styles.buttonArrow}>→</Text> : null}
                </Pressable>

                {index < lessons.length - 1 ? <View style={styles.divider} /> : null}
              </AppCard>
            )
          })}
        </View>
      )}

      <View style={styles.bottomSpace} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: 28,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 22,
  },
  eyebrow: {
    ...typography.overline,
    color: colors.textSecondary,
  },
  title: {
    ...typography.display,
    color: colors.text,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: 22,
    ...shadow.card,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconText: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '800',
  },
  summaryCopy: {
    marginLeft: 13,
  },
  summaryNumber: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.white,
  },
  summaryLabel: {
    ...typography.caption,
    color: '#D0D5DD',
    marginTop: 1,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.bodyMedium,
    color: colors.danger,
  },
  errorText: {
    ...typography.caption,
    color: '#B42318',
    marginTop: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    padding: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  languageBadgeText: {
    ...typography.caption,
    color: colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  readyBadge: {
    backgroundColor: colors.successSoft,
  },
  waitingBadge: {
    backgroundColor: colors.warningSoft,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  readyDot: {
    backgroundColor: colors.success,
  },
  waitingDot: {
    backgroundColor: colors.warning,
  },
  statusText: {
    ...typography.caption,
  },
  readyText: {
    color: '#027A48',
  },
  waitingText: {
    color: '#B54708',
  },
  date: {
    ...typography.h3,
    color: colors.text,
    marginTop: 20,
  },
  time: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  teacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  teacherInitial: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  teacherLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  teacher: {
    ...typography.bodyMedium,
    color: colors.text,
    marginTop: 1,
  },
  button: {
    minHeight: 50,
    marginTop: 18,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonDisabled: {
    backgroundColor: '#E4E7EC',
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    ...typography.bodyMedium,
    color: colors.white,
  },
  buttonArrow: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIconText: {
    fontSize: 25,
    color: colors.primary,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
  divider: {
    display: 'none',
  },
  bottomSpace: {
    height: 8,
  },
})
