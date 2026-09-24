import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { getStudentIdentity } from '@/lib/student'
import { AppCard } from '@/components/AppCard'
import { colors, radius, spacing, typography } from '@/constants/theme'

type ExerciseType = 'multipla_escolha' | 'multipla_resposta' | 'verdadeiro_falso' | 'dissertativa' | 'resposta_curta' | 'lacunas' | 'ordenar' | 'associar'

type Option = { id: string; text: string }
type Content = {
  question?: string
  text?: string
  options?: Option[]
  correctAnswer?: string
  correctAnswers?: string[]
  acceptableAnswers?: string[]
  sentences?: string[]
  correctOrder?: string[]
  pairs?: { id: string; left: string; right: string }[]
  blanks?: { id: string; answer: string; acceptableAnswers?: string[] }[]
  pergunta?: string
  afirmacao?: string
  alternativas?: { id: string; text?: string; texto?: string }[]
  correta?: string | boolean
  corretas?: string[]
  resposta_correta?: string
  lacunas?: { resposta: string; id?: string; acceptableAnswers?: string[] }[]
  itens?: string[]
  ordem_correta?: number[]
}

type Activity = {
  id: string
  idioma: 'ingles' | 'alemao'
  nivel: string
  categoria: string
  tipo_exercicio: ExerciseType
  titulo: string
  descricao: string | null
  instrucoes: string | null
  conteudo: Content
  explicacao: string | null
  dificuldade: number
  tempo_estimado: number
}

type Result = { correct: boolean; score: number; message: string }

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase()
}

function normalizeContent(raw: Record<string, unknown>): Content {
  const c = raw as Content
  const options = c.options?.length
    ? c.options
    : (c.alternativas || []).map((option) => ({
        id: option.id,
        text: option.text ?? option.texto ?? '',
      }))
  return {
    ...c,
    question: c.question || c.pergunta,
    options,
    correctAnswer: c.correctAnswer ?? (c.correta !== undefined ? String(c.correta) : undefined),
    correctAnswers: c.correctAnswers || c.corretas,
    acceptableAnswers: c.acceptableAnswers || (c.resposta_correta ? [c.resposta_correta] : undefined),
    sentences: c.sentences || c.itens,
    correctOrder: c.correctOrder || c.ordem_correta?.map(String),
    blanks: c.blanks || c.lacunas?.map((blank, index) => ({
      id: blank.id || String(index),
      answer: blank.resposta,
      acceptableAnswers: blank.acceptableAnswers,
    })),
  }
}

export default function CentralActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const activityId = Array.isArray(id) ? id[0] : id
  const [activity, setActivity] = useState<Activity | null>(null)
  const [studentId, setStudentId] = useState('')
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [result, setResult] = useState<Result | null>(null)
  const [translation, setTranslation] = useState<Content | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [nextActivity, setNextActivity] = useState<{ id: string; titulo: string } | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const answersLoaded = useRef(false)

  useEffect(() => {
    if (!activityId) return

    // Cada atividade deve iniciar com seu próprio estado.
    // Evita que respostas, resultado ou tradução da atividade anterior
    // apareçam enquanto a nova atividade está sendo carregada.
    answersLoaded.current = false
    setAnswers({})
    setResult(null)
    setTranslation(null)
    setNextActivity(null)
    setShowInstructions(false)
    setError('')
    setLoading(true)

    let mounted = true

    async function load() {
      try {
        const identity = await getStudentIdentity()
        if (!mounted) return

        const { data: student, error: studentError } = await supabase
          .from('alunos')
          .select('id')
          .eq('user_id', identity.user.id)
          .maybeSingle()
        if (studentError || !student) throw studentError ?? new Error('Aluno não identificado.')

        const { data, error: activityError } = await supabase
          .from('central_atividades')
          .select('id,idioma,nivel,categoria,tipo_exercicio,titulo,descricao,instrucoes,conteudo,explicacao,dificuldade,tempo_estimado')
          .eq('id', activityId)
          .eq('status', 'publicada')
          .maybeSingle()
        if (activityError || !data) throw activityError ?? new Error('Atividade não encontrada.')

        const current = { ...(data as Activity), conteudo: normalizeContent((data as Activity).conteudo || {}) }
        setActivity(current)
        setStudentId(student.id)

        const { data: sequence } = await supabase
          .from('central_atividades')
          .select('id,titulo,created_at')
          .eq('idioma', current.idioma)
          .eq('nivel', current.nivel)
          .eq('status', 'publicada')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })

        const { data: completed } = await supabase
          .from('central_respostas')
          .select('atividade_id')
          .eq('aluno_id', student.id)
          .eq('concluida', true)

        const completedIds = new Set((completed ?? []).map((row) => row.atividade_id))
        const available = (sequence ?? []).filter((row) => !completedIds.has(row.id))

        // A Central trabalha somente com atividades ainda não realizadas.
        // Se uma atividade concluída for aberta por um link antigo ou estado anterior,
        // encaminha imediatamente para a primeira atividade disponível.
        if (completedIds.has(current.id)) {
          const firstAvailable = available[0]
          if (firstAvailable) {
            router.replace({
              pathname: '/(student)/central/atividade/[id]',
              params: { id: firstAvailable.id },
            })
            return
          }

          router.replace('/(student)/central')
          return
        }

        const index = available.findIndex((row) => row.id === current.id)
        if (index >= 0) setNextActivity(available[index + 1] ?? null)

        const { data: response } = await supabase
          .from('central_respostas')
          .select('respostas,pontuacao,concluida')
          .eq('atividade_id', activityId)
          .eq('aluno_id', student.id)
          .maybeSingle()

        if (response?.respostas) setAnswers(response.respostas as Record<string, unknown>)
        answersLoaded.current = true

        if (response?.concluida && typeof response.pontuacao === 'number') {
          setResult({
            correct: response.pontuacao >= 100,
            score: response.pontuacao,
            message: response.pontuacao >= 100 ? 'Muito bem! Você acertou a atividade.' : 'Resposta registrada. Revise a explicação e tente novamente.',
          })
        }

        const started = Date.now()
        setStartedAt(started)
        setElapsed(0)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível carregar a atividade.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => { mounted = false }
  }, [activityId])

  useEffect(() => {
    if (!startedAt || result) return
    const timer = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000))), 1000)
    return () => clearInterval(timer)
  }, [startedAt, result])

  useEffect(() => {
    if (!answersLoaded.current || !activity || !studentId || result) return
    const timer = setTimeout(async () => {
      await supabase.from('central_respostas').upsert({
        atividade_id: activity.id,
        aluno_id: studentId,
        respostas: answers,
        pontuacao: null,
        concluida: false,
      }, { onConflict: 'atividade_id,aluno_id' })
    }, 700)
    return () => clearTimeout(timer)
  }, [answers, activity, studentId, result])

  function formatTime(total: number) {
    return Math.floor(total / 60).toString().padStart(2, '0') + ':' + (total % 60).toString().padStart(2, '0')
  }

  function hasAnswer() {
    const answer = answers.answer
    if (Array.isArray(answer)) return answer.some((value) => String(value ?? '').trim() !== '')
    if (answers.pairs && typeof answers.pairs === 'object') return Object.keys(answers.pairs as object).length > 0
    return String(answer ?? '').trim() !== ''
  }

  function isCorrect() {
    if (!activity) return false
    const c = activity.conteudo
    const a = answers.answer

    switch (activity.tipo_exercicio) {
      case 'multipla_escolha':
        return String(a ?? '') === String(c.correctAnswer ?? '')
      case 'verdadeiro_falso': {
        const expected = typeof c.correta === 'boolean' ? String(c.correta) : String(c.correctAnswer ?? '')
        return String(a ?? '') === expected
      }
      case 'multipla_resposta': {
        const expected = [...(c.correctAnswers ?? [])].map(String).sort()
        const actual = Array.isArray(a) ? a.map(String).sort() : []
        return JSON.stringify(actual) === JSON.stringify(expected)
      }
      case 'resposta_curta': {
        const accepted = [c.correctAnswer ?? '', ...(c.acceptableAnswers ?? [])].map(normalize)
        return accepted.includes(normalize(String(a ?? '')))
      }
      case 'lacunas': {
        const values = Array.isArray(a) ? a.map(String) : []
        return (c.blanks ?? []).every((blank, index) =>
          [blank.answer, ...(blank.acceptableAnswers ?? [])].map(normalize).includes(normalize(values[index] ?? ''))
        )
      }
      case 'ordenar':
        return JSON.stringify(Array.isArray(a) ? a : []) === JSON.stringify(c.correctOrder ?? [])
      case 'associar': {
        const pairs = (answers.pairs && typeof answers.pairs === 'object' ? answers.pairs : {}) as Record<string, string>
        return (c.pairs ?? []).every((pair) => pairs[pair.id] === pair.right)
      }
      default:
        return false
    }
  }

  async function submit() {
    if (!activity || !studentId || !hasAnswer() || saving) return
    setSaving(true)
    setError('')

    const automatic = ['multipla_escolha', 'multipla_resposta', 'verdadeiro_falso', 'resposta_curta', 'lacunas', 'ordenar', 'associar'].includes(activity.tipo_exercicio)
    const correct = automatic && isCorrect()
    const score = automatic ? (correct ? 100 : 0) : 0

    const { data: existing } = await supabase
      .from('central_respostas')
      .select('id')
      .eq('atividade_id', activity.id)
      .eq('aluno_id', studentId)
      .maybeSingle()

    const payload = {
      atividade_id: activity.id,
      aluno_id: studentId,
      respostas: answers,
      pontuacao: score,
      concluida: true,
    }

    const response = existing?.id
      ? await supabase.from('central_respostas').update(payload).eq('id', existing.id)
      : await supabase.from('central_respostas').insert(payload)

    if (response.error) {
      setError(response.error.message)
      setSaving(false)
      return
    }

    setResult({
      correct,
      score,
      message: automatic
        ? correct
          ? 'Muito bem! Você acertou a atividade.'
          : 'Resposta registrada. Revise a explicação e tente novamente.'
        : 'Resposta registrada para análise.',
    })
    setSaving(false)
  }

  async function translate() {
    if (!activity || translating) return
    if (translation) {
      setTranslation(null)
      return
    }

    setTranslating(true)
    setError('')
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData.session
    if (!session) {
      setError('Sua sessão expirou.')
      setTranslating(false)
      return
    }

    const { data, error: invokeError } = await supabase.functions.invoke('traduzir-central-atividade', {
      body: { idioma: activity.idioma, content: activity.conteudo, target: 'pt' },
      headers: { Authorization: 'Bearer ' + session.access_token },
    })

    if (invokeError || !data?.translation) {
      setError('Não foi possível traduzir agora. Tente novamente.')
    } else {
      setTranslation(normalizeContent(data.translation as Record<string, unknown>))
    }
    setTranslating(false)
  }

  function toggleMultiple(id: string) {
    const current = Array.isArray(answers.answer) ? answers.answer as string[] : []
    setAnswers({ ...answers, answer: current.includes(id) ? current.filter((value) => value !== id) : [...current, id] })
  }

  function moveOrder(index: number, direction: -1 | 1) {
    if (!activity) return
    const current = Array.isArray(answers.answer)
      ? [...answers.answer as string[]]
      : [...(activity.conteudo.sentences ?? [])]
    const target = index + direction
    if (target < 0 || target >= current.length) return
    ;[current[index], current[target]] = [current[target], current[index]]
    setAnswers({ ...answers, answer: current })
  }

  function renderExercise() {
    if (!activity) return null
    const c = activity.conteudo

    if (activity.tipo_exercicio === 'multipla_escolha' || activity.tipo_exercicio === 'verdadeiro_falso') {
      const options = activity.tipo_exercicio === 'verdadeiro_falso' && !(c.options ?? []).length
        ? [{ id: 'true', text: 'Verdadeiro' }, { id: 'false', text: 'Falso' }]
        : (c.options ?? [])
      return (
        <View style={styles.options}>
          {options.map((option) => (
            <Pressable key={option.id} onPress={() => setAnswers({ ...answers, answer: option.id })} style={[styles.option, answers.answer === option.id && styles.optionSelected]}>
              <View style={[styles.radio, answers.answer === option.id && styles.radioSelected]} />
              <Text style={styles.optionText}>{option.text}</Text>
            </Pressable>
          ))}
        </View>
      )
    }

    if (activity.tipo_exercicio === 'multipla_resposta') {
      const selected = Array.isArray(answers.answer) ? answers.answer as string[] : []
      return (
        <View style={styles.options}>
          {(c.options ?? []).map((option) => (
            <Pressable key={option.id} onPress={() => toggleMultiple(option.id)} style={[styles.option, selected.includes(option.id) && styles.optionSelected]}>
              <View style={[styles.checkbox, selected.includes(option.id) && styles.checkboxSelected]}>
                {selected.includes(option.id) ? <Ionicons name="checkmark" size={15} color={colors.white} /> : null}
              </View>
              <Text style={styles.optionText}>{option.text}</Text>
            </Pressable>
          ))}
        </View>
      )
    }

    if (activity.tipo_exercicio === 'resposta_curta' || activity.tipo_exercicio === 'dissertativa') {
      return (
        <TextInput
          value={String(answers.answer ?? '')}
          onChangeText={(value) => setAnswers({ ...answers, answer: value })}
          placeholder={activity.tipo_exercicio === 'dissertativa' ? 'Escreva sua resposta...' : 'Digite sua resposta...'}
          placeholderTextColor={colors.textTertiary}
          multiline={activity.tipo_exercicio === 'dissertativa'}
          numberOfLines={activity.tipo_exercicio === 'dissertativa' ? 7 : 1}
          textAlignVertical={activity.tipo_exercicio === 'dissertativa' ? 'top' : 'center'}
          style={[styles.input, activity.tipo_exercicio === 'dissertativa' && styles.textarea]}
        />
      )
    }

    if (activity.tipo_exercicio === 'lacunas') {
      const values = Array.isArray(answers.answer) ? answers.answer as string[] : []
      return (
        <View style={styles.gapFields}>
          {(c.blanks ?? []).map((blank, index) => (
            <TextInput
              key={blank.id}
              value={values[index] ?? ''}
              onChangeText={(value) => {
                const next = [...values]
                next[index] = value
                setAnswers({ ...answers, answer: next })
              }}
              placeholder={'Resposta ' + (index + 1)}
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          ))}
        </View>
      )
    }

    if (activity.tipo_exercicio === 'ordenar') {
      const items = Array.isArray(answers.answer) ? answers.answer as string[] : [...(c.sentences ?? [])]
      return (
        <View style={styles.orderList}>
          {items.map((item, index) => (
            <View key={item + index} style={styles.orderItem}>
              <View style={styles.orderNumber}><Text style={styles.orderNumberText}>{index + 1}</Text></View>
              <Text style={styles.orderText}>{item}</Text>
              <View style={styles.orderButtons}>
                <Pressable disabled={index === 0} onPress={() => moveOrder(index, -1)} style={styles.orderButton}><Ionicons name="chevron-up" size={18} color={index === 0 ? colors.borderStrong : colors.primary} /></Pressable>
                <Pressable disabled={index === items.length - 1} onPress={() => moveOrder(index, 1)} style={styles.orderButton}><Ionicons name="chevron-down" size={18} color={index === items.length - 1 ? colors.borderStrong : colors.primary} /></Pressable>
              </View>
            </View>
          ))}
        </View>
      )
    }

    if (activity.tipo_exercicio === 'associar') {
      const pairs = answers.pairs && typeof answers.pairs === 'object' ? answers.pairs as Record<string, string> : {}
      return (
        <View style={styles.gapFields}>
          {(c.pairs ?? []).map((pair) => (
            <View key={pair.id} style={styles.pairRow}>
              <Text style={styles.pairLeft}>{pair.left}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pairOptions}>
                {(c.pairs ?? []).map((candidate) => (
                  <Pressable key={candidate.id} onPress={() => setAnswers({ ...answers, pairs: { ...pairs, [pair.id]: candidate.right } })} style={[styles.pairChip, pairs[pair.id] === candidate.right && styles.pairChipSelected]}>
                    <Text style={[styles.pairChipText, pairs[pair.id] === candidate.right && styles.pairChipTextSelected]}>{candidate.right}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ))}
        </View>
      )
    }

    return <Text style={styles.unsupported}>Este tipo de atividade ainda não está disponível.</Text>
  }

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.loadingText}>Carregando atividade...</Text></View>
  }

  if (!activity) {
    return (
      <View style={styles.errorPage}>
        <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
        <Text style={styles.errorTitle}>Atividade indisponível</Text>
        <Text style={styles.errorText}>{error || 'Não foi possível carregar esta atividade.'}</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/(student)/central')}>
          <Text style={styles.primaryButtonText}>Voltar para a Central</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Pressable style={styles.back} onPress={() => router.replace('/(student)/central')}>
        <Ionicons name="arrow-back" size={19} color={colors.primary} />
        <Text style={styles.backText}>Central de Atividades</Text>
      </Pressable>

      <View style={styles.breadcrumb}>
        <Text style={styles.breadcrumbText}>Central</Text>
        <Text style={styles.breadcrumbDot}>•</Text>
        <Text style={styles.breadcrumbText}>{activity.idioma === 'ingles' ? 'Inglês' : 'Alemão'}</Text>
        <Text style={styles.breadcrumbDot}>•</Text>
        <Text style={styles.breadcrumbText}>{activity.nivel}</Text>
      </View>

      <AppCard elevated style={styles.heroCard}>
        <View style={styles.eyebrowRow}>
          <Text style={styles.eyebrow}>ATIVIDADE DE PRÁTICA</Text>
          <View style={styles.timer}><Ionicons name="time-outline" size={14} color={colors.primary} /><Text style={styles.timerText}>{formatTime(elapsed)}</Text></View>
        </View>
        <Text style={styles.title}>{activity.titulo}</Text>
        {activity.descricao ? <Text style={styles.description}>{activity.descricao}</Text> : null}
      </AppCard>

      {activity.instrucoes ? (
        <View style={styles.instructionsSection}>
          <Pressable
            onPress={() => setShowInstructions((visible) => !visible)}
            style={styles.instructionsToggle}
          >
            <View style={styles.instructionsToggleLeft}>
              <Ionicons name="help-circle-outline" size={19} color={colors.primary} />
              <Text style={styles.instructionsToggleText}>Como fazer?</Text>
            </View>
            <Ionicons
              name={showInstructions ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          {showInstructions ? (
            <View style={styles.instructions}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <View style={styles.instructionsCopy}>
                <Text style={styles.instructionsTitle}>Como fazer</Text>
                <Text style={styles.instructionsText}>{activity.instrucoes}</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.translationBar}>
        <Pressable onPress={() => void translate()} disabled={translating} style={styles.translationButton}>
          <Ionicons name={translating ? 'sync-outline' : translation ? 'arrow-back' : 'language-outline'} size={16} color={colors.primary} />
          <Text style={styles.translationText}>{translating ? 'Traduzindo...' : translation ? 'Voltar ao idioma original' : 'Traduzir para português'}</Text>
        </Pressable>
      </View>

      <View style={[styles.languageGrid, translation && styles.languageGridTranslated]}>
        <View style={styles.languageColumn}>
          <Text style={styles.languageLabel}>IDIOMA ORIGINAL</Text>
          {activity.conteudo.text ? <View style={styles.textBox}><Text style={styles.boxLabel}>Texto de apoio</Text><Text style={styles.boxText}>{activity.conteudo.text}</Text></View> : null}
          {activity.conteudo.question ? <View style={styles.questionBox}><Text style={styles.boxLabel}>Pergunta</Text><Text style={styles.questionText}>{activity.conteudo.question}</Text></View> : null}
        </View>
        {translation ? (
          <View style={[styles.languageColumn, styles.translatedColumn]}>
            <Text style={styles.languageLabel}>PORTUGUÊS</Text>
            {translation.text ? <View style={styles.textBox}><Text style={styles.boxLabel}>Texto de apoio</Text><Text style={styles.boxText}>{translation.text}</Text></View> : null}
            {translation.question ? <View style={styles.questionBox}><Text style={styles.boxLabel}>Pergunta</Text><Text style={styles.questionText}>{translation.question}</Text></View> : null}
          </View>
        ) : null}
      </View>

      <View style={styles.answerSection}>
        <Text style={styles.answerLabel}>RESPOSTA</Text>
        {renderExercise()}
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>PROGRESSO DA ATIVIDADE</Text>
          <Text style={styles.progressValue}>{result ? '100%' : hasAnswer() ? 'Em andamento' : 'Comece quando estiver pronto'}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: result ? '100%' : hasAnswer() ? '55%' : '0%' }]} />
        </View>
      </View>

      {error ? <View style={styles.error}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}

      {result ? (
        <View style={[styles.resultCard, result.correct && styles.resultCardSuccess]}>
          <View style={styles.resultTop}>
            <View style={styles.resultIcon}><Ionicons name={result.correct ? 'checkmark-circle' : 'help-circle'} size={25} color={result.correct ? colors.success : colors.warning} /></View>
            <View style={styles.resultCopy}><Text style={styles.resultEyebrow}>{result.correct ? 'MUITO BEM!' : 'ATIVIDADE CONCLUÍDA'}</Text><Text style={styles.resultMessage}>{result.message}</Text></View>
            <View><Text style={styles.score}>{result.score}</Text><Text style={styles.scoreLabel}>/100</Text></View>
          </View>
          {activity.explicacao ? <View style={styles.explanation}><Text style={styles.explanationTitle}>Explicação</Text><Text style={styles.explanationText}>{activity.explicacao}</Text></View> : null}
          <View style={styles.resultActions}>
            <Pressable style={styles.secondaryButton} onPress={() => {
              setAnswers({})
              setResult(null)
              setStartedAt(Date.now())
              setElapsed(0)
            }}>
              <Ionicons name="refresh" size={17} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Refazer</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={() => nextActivity ? router.replace({ pathname: '/(student)/central/atividade/[id]', params: { id: nextActivity.id } }) : router.replace('/(student)/central')}>
              <Text style={styles.primaryButtonText}>{nextActivity ? 'Próxima atividade' : 'Voltar para a Central'}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace('/(student)/central')}>
            <Ionicons name="arrow-back" size={17} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Voltar</Text>
          </Pressable>
          <Pressable disabled={!hasAnswer() || saving} style={[styles.primaryButton, (!hasAnswer() || saving) && styles.primaryButtonDisabled]} onPress={() => void submit()}>
            {saving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.primaryButtonText}>Concluir atividade</Text>}
            {!saving ? <Ionicons name="arrow-forward" size={18} color={colors.white} /> : null}
          </Pressable>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { ...typography.caption, color: colors.textSecondary },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xxl, paddingTop: 28, paddingBottom: 48 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  backText: { ...typography.bodyMedium, color: colors.primary },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 16 },
  breadcrumbText: { ...typography.caption, color: colors.textTertiary },
  breadcrumbDot: { color: colors.borderStrong },
  heroCard: { marginBottom: 14 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { ...typography.overline, color: colors.primary },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  timerText: { ...typography.caption, color: colors.primary },
  title: { ...typography.h1, color: colors.text, marginTop: 9 },
  description: { ...typography.body, color: colors.textSecondary, marginTop: 7 },
  instructionsSection: { marginBottom: 14 },
  instructionsToggle: { minHeight: 42, paddingHorizontal: 13, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  instructionsToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  instructionsToggleText: { ...typography.bodyMedium, color: colors.primary },
  instructions: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: colors.primarySoft, marginTop: 8 },
  instructionsCopy: { flex: 1 },
  instructionsTitle: { ...typography.bodyMedium, color: colors.text },
  instructionsText: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  translationBar: { alignItems: 'flex-start', marginBottom: 12 },
  translationButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  translationText: { ...typography.caption, color: colors.primary },
  languageGrid: { gap: 12, marginBottom: 18 },
  languageGridTranslated: {},
  languageColumn: { gap: 10 },
  translatedColumn: { paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  languageLabel: { ...typography.overline, color: colors.textTertiary },
  textBox: { padding: 15, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  boxLabel: { ...typography.overline, color: colors.textTertiary, fontSize: 8 },
  boxText: { ...typography.body, color: colors.text, marginTop: 5 },
  questionBox: { padding: 16, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  questionText: { ...typography.h3, color: colors.text, marginTop: 5 },
  answerSection: { marginTop: 4 },
  answerLabel: { ...typography.overline, color: colors.textSecondary, marginBottom: 10 },
  options: { gap: 9 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 52, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionText: { ...typography.body, color: colors.text, flex: 1 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 14, color: colors.text, fontSize: 15 },
  textarea: { minHeight: 150, paddingTop: 13 },
  gapFields: { gap: 10 },
  orderList: { gap: 9 },
  orderItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  orderNumber: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  orderNumberText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  orderText: { flex: 1, ...typography.body, color: colors.text },
  orderButtons: { flexDirection: 'row', gap: 3 },
  orderButton: { width: 31, height: 31, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  pairRow: { gap: 7 },
  pairLeft: { ...typography.bodyMedium, color: colors.text },
  pairOptions: { gap: 7 },
  pairChip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pairChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pairChipText: { ...typography.caption, color: colors.textSecondary },
  pairChipTextSelected: { color: colors.white },
  unsupported: { ...typography.body, color: colors.textSecondary, padding: 15 },
  progressCard: { marginTop: 20, padding: 15, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  progressLabel: { ...typography.overline, color: colors.textTertiary, fontSize: 8 },
  progressValue: { ...typography.caption, color: colors.primary },
  progressTrack: { height: 7, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden', marginTop: 9 },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 5 },
  error: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 13, borderRadius: radius.md, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: '#FECDCA', marginTop: 14 },
  errorText: { ...typography.caption, color: colors.danger, flex: 1 },
  resultCard: { marginTop: 18, padding: 18, borderRadius: radius.lg, borderWidth: 1, borderColor: '#FAD8A8', backgroundColor: colors.warningSoft },
  resultCardSuccess: { borderColor: '#B7E6CB', backgroundColor: colors.successSoft },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  resultCopy: { flex: 1 },
  resultEyebrow: { ...typography.overline, color: colors.textTertiary, fontSize: 8 },
  resultMessage: { ...typography.bodyMedium, color: colors.text, marginTop: 2 },
  score: { fontSize: 25, lineHeight: 29, fontWeight: '800', color: colors.text, textAlign: 'right' },
  scoreLabel: { ...typography.caption, color: colors.textTertiary, textAlign: 'right' },
  explanation: { marginTop: 15, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  explanationTitle: { ...typography.bodyMedium, color: colors.text },
  explanationText: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  resultActions: { marginTop: 16, gap: 9 },
  actions: { marginTop: 18, gap: 9 },
  primaryButton: { minHeight: 50, paddingHorizontal: 15, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { ...typography.bodyMedium, color: colors.white },
  secondaryButton: { minHeight: 46, paddingHorizontal: 15, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  secondaryButtonText: { ...typography.bodyMedium, color: colors.primary },
  errorPage: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  errorTitle: { ...typography.h2, color: colors.text, marginTop: 10 },
})
