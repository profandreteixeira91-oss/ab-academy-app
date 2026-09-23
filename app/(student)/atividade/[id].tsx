import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { getStudentId } from '@/lib/student'
import { supabase } from '@/lib/supabase'
import { AppCard } from '@/components/AppCard'
import { colors, radius, spacing, typography } from '@/constants/theme'

type Exercise = {
  id: string
  titulo: string | null
  enunciado: string
  tipo: string
  ordem: number
}

type Alternative = {
  id: string
  exercicio_id: string
  texto: string
  ordem: number
}

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [alts, setAlts] = useState<Record<string, Alternative[]>>({})
  const [answers, setAnswers] = useState<Record<string, { text: string; ids: string[] }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const studentId = await getStudentId()

      const { data: activity, error: activityError } = await supabase
        .from('atividades')
        .select('id,titulo,descricao,status')
        .eq('id', id)
        .eq('aluno_id', studentId)
        .single()

      if (activityError) throw activityError

      setTitle(activity.titulo)
      setDescription(activity.descricao || '')

      const { data: exerciseData, error: exerciseError } = await supabase
        .from('atividade_exercicios')
        .select('id,titulo,enunciado,tipo,ordem')
        .eq('atividade_id', id)
        .order('ordem')

      if (exerciseError) throw exerciseError

      const loadedExercises = exerciseData ?? []
      setExercises(loadedExercises)

      const ids = loadedExercises.map((exercise) => exercise.id)

      if (ids.length) {
        const { data: alternatives, error: alternativesError } = await supabase
          .from('exercicio_alternativas')
          .select('id,exercicio_id,texto,ordem')
          .in('exercicio_id', ids)
          .order('ordem')

        if (alternativesError) throw alternativesError

        const grouped: Record<string, Alternative[]> = {}

        for (const alternative of alternatives ?? []) {
          ;(grouped[alternative.exercicio_id] ??= []).push(alternative)
        }

        setAlts(grouped)
      }
    } catch (e) {
      Alert.alert(
        'Atividade',
        e instanceof Error ? e.message : 'Não foi possível carregar a atividade.'
      )
      router.back()
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  function toggle(exerciseId: string, alternativeId: string, single: boolean) {
    setAnswers((previous) => {
      const current = previous[exerciseId] ?? { text: '', ids: [] }

      const ids = single
        ? current.ids.includes(alternativeId)
          ? []
          : [alternativeId]
        : current.ids.includes(alternativeId)
          ? current.ids.filter((value) => value !== alternativeId)
          : [...current.ids, alternativeId]

      return {
        ...previous,
        [exerciseId]: {
          ...current,
          ids,
        },
      }
    })
  }

  async function submit() {
    if (!id) return

    setSaving(true)

    try {
      const studentId = await getStudentId()

      const { data: current, error: currentError } = await supabase
        .from('respostas_aluno')
        .select('id')
        .eq('atividade_id', id)
        .eq('aluno_id', studentId)

      if (currentError) throw currentError

      const oldIds = (current ?? []).map((answer) => answer.id)

      if (oldIds.length) {
        const { error } = await supabase
          .from('respostas_aluno')
          .delete()
          .in('id', oldIds)

        if (error) throw error
      }

      const rows = exercises.map((exercise) => {
        const answer = answers[exercise.id] ?? { text: '', ids: [] }
        const objective = [
          'multipla_escolha',
          'multipla_resposta',
          'verdadeiro_falso',
        ].includes(exercise.tipo)

        return {
          atividade_id: id,
          exercicio_id: exercise.id,
          aluno_id: studentId,
          resposta_texto:
            objective
              ? answer.ids.length > 1
                ? JSON.stringify(answer.ids)
                : null
              : answer.text.trim() || null,
          alternativa_id:
            objective &&
            (exercise.tipo === 'multipla_escolha' ||
              exercise.tipo === 'verdadeiro_falso')
              ? answer.ids[0] || null
              : null,
          pontuacao: null,
          feedback: null,
          corrigida: false,
        }
      })

      if (rows.length) {
        const { error } = await supabase.from('respostas_aluno').insert(rows)
        if (error) throw error
      }

      const { data: updated, error: updateError } = await supabase
        .from('atividades')
        .update({
          status: 'respondida',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('aluno_id', studentId)
        .select('id,status')
        .maybeSingle()

      if (updateError) throw updateError

      if (!updated || updated.status !== 'respondida') {
        throw new Error('Não foi possível confirmar o envio da atividade.')
      }

      Alert.alert('Atividade', 'Atividade enviada com sucesso.')
      router.back()
    } catch (e) {
      Alert.alert(
        'Atividade',
        e instanceof Error ? e.message : 'Não foi possível enviar a atividade.'
      )
    } finally {
      setSaving(false)
    }
  }

  const answeredCount = useMemo(
    () =>
      exercises.filter((exercise) => {
        const answer = answers[exercise.id]
        return Boolean(answer?.text.trim() || answer?.ids.length)
      }).length,
    [answers, exercises]
  )

  const progress = exercises.length ? answeredCount / exercises.length : 0

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
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backArrow}>‹</Text>
        <Text style={styles.backText}>Voltar</Text>
      </Pressable>

      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>ATIVIDADE</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>

      <AppCard elevated style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressLabel}>SEU PROGRESSO</Text>
            <Text style={styles.progressTitle}>
              {answeredCount} de {exercises.length} respondidas
            </Text>
          </View>
          <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </AppCard>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Questões</Text>
        <Text style={styles.sectionSubtitle}>
          Responda com atenção antes de enviar.
        </Text>
      </View>

      {exercises.map((exercise, index) => {
        const options = alts[exercise.id] ?? []
        const single =
          exercise.tipo === 'multipla_escolha' ||
          exercise.tipo === 'verdadeiro_falso'
        const currentAnswer = answers[exercise.id] ?? { text: '', ids: [] }
        const answered = Boolean(
          currentAnswer.text.trim() || currentAnswer.ids.length
        )

        return (
          <AppCard key={exercise.id} elevated={answered} style={styles.exercise}>
            <View style={styles.exerciseTop}>
              <View style={styles.questionNumber}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.questionMeta}>
                <Text style={styles.questionLabel}>QUESTÃO {index + 1}</Text>
                <Text style={styles.questionType}>
                  {options.length
                    ? single
                      ? 'Escolha uma opção'
                      : 'Selecione as opções'
                    : 'Resposta escrita'}
                </Text>
              </View>
              {answered ? (
                <View style={styles.answeredBadge}>
                  <Text style={styles.answeredText}>OK</Text>
                </View>
              ) : null}
            </View>

            {exercise.titulo ? (
              <Text style={styles.exerciseTitle}>{exercise.titulo}</Text>
            ) : null}

            <Text style={styles.question}>{exercise.enunciado}</Text>

            {options.length ? (
              <View style={styles.options}>
                {options.map((option, optionIndex) => {
                  const selected = currentAnswer.ids.includes(option.id)

                  return (
                    <Pressable
                      key={option.id}
                      style={({ pressed }) => [
                        styles.option,
                        selected && styles.optionSelected,
                        pressed && styles.optionPressed,
                      ]}
                      onPress={() => toggle(exercise.id, option.id, single)}
                    >
                      <View
                        style={[
                          styles.optionIndicator,
                          selected && styles.optionIndicatorSelected,
                        ]}
                      >
                        {selected ? (
                          <Text style={styles.optionCheck}>✓</Text>
                        ) : (
                          <Text style={styles.optionLetter}>
                            {String.fromCharCode(65 + optionIndex)}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                        ]}
                      >
                        {option.texto}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            ) : (
              <TextInput
                style={styles.input}
                multiline
                placeholder="Digite sua resposta..."
                placeholderTextColor={colors.textTertiary}
                value={currentAnswer.text}
                onChangeText={(text) =>
                  setAnswers((previous) => ({
                    ...previous,
                    [exercise.id]: {
                      text,
                      ids: previous[exercise.id]?.ids ?? [],
                    },
                  }))
                }
              />
            )}
          </AppCard>
        )
      })}

      <View style={styles.submitArea}>
        <Text style={styles.submitHint}>
          Revise suas respostas antes de enviar a atividade.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.submit,
            saving && styles.submitDisabled,
            pressed && !saving && styles.submitPressed,
          ]}
          disabled={saving}
          onPress={() => void submit()}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.submitText}>Enviar atividade</Text>
              <Text style={styles.submitArrow}>→</Text>
            </>
          )}
        </Pressable>
      </View>
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
    paddingTop: 28,
    paddingBottom: 48,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.xl,
  },
  backArrow: {
    fontSize: 27,
    lineHeight: 22,
    color: colors.text,
    marginRight: 5,
  },
  backText: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  headerBadgeText: {
    ...typography.overline,
    color: colors.textSecondary,
    fontSize: 9,
    letterSpacing: 0.9,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  progressCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    marginBottom: spacing.xxl,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  progressLabel: {
    ...typography.overline,
    color: '#AAB2C0',
  },
  progressTitle: {
    ...typography.bodyMedium,
    color: colors.white,
    marginTop: 3,
  },
  progressPercent: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    color: colors.white,
  },
  progressTrack: {
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: '#343B48',
    overflow: 'hidden',
    marginTop: spacing.xl,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.white,
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
  exercise: {
    marginBottom: spacing.md,
    padding: spacing.xl,
  },
  exerciseTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionNumber: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumberText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  questionMeta: {
    flex: 1,
    marginLeft: spacing.md,
  },
  questionLabel: {
    ...typography.overline,
    color: colors.text,
    fontSize: 9,
  },
  questionType: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 1,
  },
  answeredBadge: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  answeredText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.success,
  },
  exerciseTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.xl,
  },
  question: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 56,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionPressed: {
    opacity: 0.82,
  },
  optionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    backgroundColor: colors.surface,
  },
  optionIndicatorSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionLetter: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  optionCheck: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  optionText: {
    flex: 1,
    ...typography.body,
    color: colors.textSecondary,
  },
  optionTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  input: {
    minHeight: 130,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceMuted,
  },
  submitArea: {
    marginTop: spacing.md,
  },
  submitHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  submit: {
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  submitText: {
    ...typography.bodyMedium,
    color: colors.white,
  },
  submitArrow: {
    fontSize: 21,
    color: colors.white,
    marginLeft: spacing.sm,
  },
})
