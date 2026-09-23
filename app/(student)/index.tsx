import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { canEnterLesson, getNextLessonOccurrence, getStudentIdentity } from '@/lib/student'
import { supabase } from '@/lib/supabase'
import { colors, radius, shadow, spacing, typography } from '@/constants/theme'
import { AppCard } from '@/components/AppCard'

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

export default function StudentHome() {
  const [name, setName] = useState('Aluno')
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null)
  const [activitiesCount, setActivitiesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setError('')
      const identity = await getStudentIdentity()
      setName(identity.name)

      const { data: horarios, error: horariosError } = await supabase
        .from('horarios')
        .select('id, idioma, dia_semana, hora_inicio, hora_fim, professor_id, meet_url')
        .eq('aluno_id', identity.studentId)

      if (horariosError) throw horariosError

      const professorIds = Array.from(
        new Set((horarios ?? []).map(item => item.professor_id).filter(Boolean)),
      )

      const { data: professores, error: professoresError } = professorIds.length
        ? await supabase.from('professores').select('id, nome_completo').in('id', professorIds)
        : { data: [], error: null }

      if (professoresError) throw professoresError

      const professorMap = new Map(
        (professores ?? []).map(item => [item.id, item.nome_completo]),
      )

      const lessons: Lesson[] = (horarios ?? [])
        .map(item => {
          const { startAt, endAt } = getNextLessonOccurrence(
            Number(item.dia_semana),
            item.hora_inicio,
            item.hora_fim,
          )

          return {
            id: item.id,
            language: item.idioma === 'ingles' ? 'Inglês' : 'Alemão',
            date: startAt.toLocaleDateString('pt-BR'),
            time: item.hora_inicio.slice(0, 5),
            teacher: professorMap.get(item.professor_id) || 'Professor',
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            meetUrl: item.meet_url || undefined,
          }
        })
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

      setNextLesson(lessons[0] ?? null)

      const { count, error: activitiesError } = await supabase
        .from('atividades')
        .select('id', { count: 'exact', head: true })
        .eq('aluno_id', identity.studentId)
        .neq('status', 'rascunho')

      if (activitiesError) throw activitiesError
      setActivitiesCount(count ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o portal.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const lessonReady = useMemo(
    () => (nextLesson ? canEnterLesson(nextLesson.startAt, nextLesson.endAt) : false),
    [nextLesson],
  )

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando seu portal...</Text>
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
          <Text style={styles.eyebrow}>PORTAL DO ALUNO</Text>
          <Text style={styles.title}>Olá, {name.split(' ')[0]}!</Text>
          <Text style={styles.subtitle}>Seu aprendizado continua aqui.</Text>
        </View>
        <Pressable style={styles.profileButton} onPress={() => router.push('/(student)/mais')}>
          <Text style={styles.profileInitial}>{name.charAt(0).toUpperCase()}</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.error}>
          <Text style={styles.errorTitle}>Não foi possível atualizar</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Próxima aula</Text>
          <Text style={styles.sectionSubtitle}>Sua próxima experiência de aprendizado</Text>
        </View>
      </View>

      <AppCard elevated style={styles.lessonCard}>
        {nextLesson ? (
          <>
            <View style={styles.lessonTop}>
              <View style={styles.languageBadge}>
                <Text style={styles.languageBadgeText}>{nextLesson.language}</Text>
              </View>
              <View style={[styles.statusBadge, lessonReady ? styles.statusReady : styles.statusWaiting]}>
                <View style={[styles.statusDot, lessonReady ? styles.dotReady : styles.dotWaiting]} />
                <Text style={[styles.statusText, lessonReady ? styles.textReady : styles.textWaiting]}>
                  {lessonReady ? 'Disponível' : 'Agendada'}
                </Text>
              </View>
            </View>

            <Text style={styles.lessonTitle}>{nextLesson.date}</Text>
            <Text style={styles.lessonTime}>{nextLesson.time}</Text>

            <View style={styles.teacherRow}>
              <View style={styles.teacherAvatar}>
                <Text style={styles.teacherInitial}>{nextLesson.teacher.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.teacherCopy}>
                <Text style={styles.teacherLabel}>Professor</Text>
                <Text style={styles.teacherName}>{nextLesson.teacher}</Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                !lessonReady && styles.buttonDisabled,
                pressed && lessonReady && styles.buttonPressed,
              ]}
              disabled={!lessonReady}
              onPress={() =>
                router.push({
                  pathname: '/(student)/aula/[id]',
                  params: { id: nextLesson.id },
                })
              }
            >
              <Text style={styles.buttonText}>
                {lessonReady ? 'Entrar na aula' : 'Acesso liberado 5 min antes'}
              </Text>
              {lessonReady ? <Text style={styles.buttonArrow}>→</Text> : null}
            </Pressable>
          </>
        ) : (
          <View style={styles.emptyLesson}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>+</Text>
            </View>
            <Text style={styles.emptyTitle}>Nenhuma aula agendada</Text>
            <Text style={styles.emptyText}>Sua próxima aula aparecerá aqui.</Text>
          </View>
        )}
      </AppCard>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Seu progresso</Text>
          <Text style={styles.sectionSubtitle}>Acesse rapidamente sua rotina</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <Pressable
          style={({ pressed }) => [styles.statCard, pressed && styles.cardPressed]}
          onPress={() => router.push('/(student)/atividades')}
        >
          <View style={styles.statIcon}>
            <Text style={styles.statIconText}>✓</Text>
          </View>
          <Text style={styles.statNumber}>{activitiesCount}</Text>
          <Text style={styles.statLabel}>Atividades disponíveis</Text>
          <Text style={styles.statLink}>Ver atividades →</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.statCard, pressed && styles.cardPressed]}
          onPress={() => router.push('/(student)/aulas')}
        >
          <View style={styles.statIcon}>
            <Text style={styles.statIconText}>▣</Text>
          </View>
          <Text style={styles.statNumber}>→</Text>
          <Text style={styles.statLabel}>Minha agenda de aulas</Text>
          <Text style={styles.statLink}>Ver aulas →</Text>
        </Pressable>
      </View>

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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 28,
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
    ...typography.display,
    color: colors.text,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  profileInitial: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.white,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
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
    marginTop: spacing.xs,
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
  lessonCard: {
    marginBottom: 28,
  },
  lessonTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  languageBadgeText: {
    ...typography.caption,
    color: colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusReady: {
    backgroundColor: colors.successSoft,
  },
  statusWaiting: {
    backgroundColor: colors.warningSoft,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotReady: {
    backgroundColor: colors.success,
  },
  dotWaiting: {
    backgroundColor: colors.warning,
  },
  statusText: {
    ...typography.caption,
  },
  textReady: {
    color: '#027A48',
  },
  textWaiting: {
    color: '#B54708',
  },
  lessonTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: 20,
  },
  lessonTime: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  teacherAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherInitial: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  teacherCopy: {
    marginLeft: 10,
  },
  teacherLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  teacherName: {
    ...typography.bodyMedium,
    color: colors.text,
    marginTop: 1,
  },
  button: {
    minHeight: 52,
    marginTop: 20,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginLeft: 10,
  },
  emptyLesson: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyIconText: {
    fontSize: 24,
    fontWeight: '400',
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
    marginTop: 5,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minHeight: 170,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  statIconText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  statNumber: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    minHeight: 36,
  },
  statLink: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 10,
  },
  bottomSpace: {
    height: 8,
  },
})
