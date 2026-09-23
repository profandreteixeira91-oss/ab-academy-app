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
import { Ionicons } from '@expo/vector-icons'
import { getStudentIdentity } from '@/lib/student'
import { supabase } from '@/lib/supabase'
import { AppCard } from '@/components/AppCard'
import { colors, radius, spacing, typography } from '@/constants/theme'

type Language = 'ingles' | 'alemao'
type Level = 'iniciante' | 'basico' | 'intermediario' | 'avancado' | 'fluente'
type Category = 'vocabulario' | 'gramatica' | 'leitura' | 'compreensao' | 'escrita' | 'cotidiano' | 'revisao'

type Profile = {
  id: string
  nome_completo: string
  idioma: Language | null
  nivel_conversacao: Level | null
  nivel_escrita: Level | null
  nivel_compreensao: Level | null
}

type Activity = {
  id: string
  idioma: Language
  nivel: Level
  categoria: Category
  tipo_exercicio: string
  titulo: string
  descricao: string | null
  dificuldade: number
  tempo_estimado: number
}

const LEVELS: { value: Level; label: string }[] = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'basico', label: 'Básico' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
  { value: 'fluente', label: 'Fluente' },
]

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'vocabulario', label: 'Vocabulário' },
  { value: 'gramatica', label: 'Gramática' },
  { value: 'leitura', label: 'Leitura' },
  { value: 'compreensao', label: 'Compreensão' },
  { value: 'escrita', label: 'Escrita' },
  { value: 'cotidiano', label: 'Cotidiano' },
  { value: 'revisao', label: 'Revisão' },
]

const LEVEL_ORDER: Level[] = ['iniciante', 'basico', 'intermediario', 'avancado', 'fluente']
const LANGUAGE_LABELS: Record<Language, string> = { ingles: 'Inglês', alemao: 'Alemão' }

function recommendedLevel(profile: Profile | null): Level {
  if (!profile) return 'iniciante'
  const values = [profile.nivel_conversacao, profile.nivel_escrita, profile.nivel_compreensao]
    .filter((value): value is Level => Boolean(value))
  if (!values.length) return 'iniciante'
  return LEVEL_ORDER[Math.min(...values.map((value) => LEVEL_ORDER.indexOf(value)))]
}

export default function CentralScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [language, setLanguage] = useState<Language | ''>('')
  const [level, setLevel] = useState<Level>('iniciante')
  const [category, setCategory] = useState<Category | 'todas'>('todas')
  const [activities, setActivities] = useState<Activity[]>([])
  const [completed, setCompleted] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setError('')
      const identity = await getStudentIdentity()

      const { data: profileData, error: profileError } = await supabase
        .from('alunos')
        .select('id,nome_completo,idioma,nivel_conversacao,nivel_escrita,nivel_compreensao')
        .eq('user_id', identity.user.id)
        .maybeSingle()

      if (profileError) throw profileError

      const nextProfile = (profileData ?? null) as Profile | null
      setProfile(nextProfile)

      const nextLanguage = nextProfile?.idioma ?? ''
      const nextLevel = recommendedLevel(nextProfile)
      setLanguage(nextLanguage)
      setLevel(nextLevel)

      if (!nextProfile?.id || !nextLanguage) {
        setActivities([])
        setCompleted(0)
        setCorrect(0)
        return
      }

      const { data: responses, error: responsesError } = await supabase
        .from('central_respostas')
        .select('atividade_id,pontuacao,concluida')
        .eq('aluno_id', nextProfile.id)
        .eq('concluida', true)

      if (responsesError) throw responsesError

      const completedRows = responses ?? []
      const completedIds = new Set(completedRows.map((row) => row.atividade_id))
      setCompleted(completedRows.length)
      setCorrect(completedRows.filter((row) => typeof row.pontuacao === 'number' && row.pontuacao >= 100).length)

      let query = supabase
        .from('central_atividades')
        .select('id,idioma,nivel,categoria,tipo_exercicio,titulo,descricao,dificuldade,tempo_estimado')
        .eq('idioma', nextLanguage)
        .eq('nivel', nextLevel)
        .eq('status', 'publicada')
        .order('created_at', { ascending: false })

      if (category !== 'todas') query = query.eq('categoria', category)

      const { data, error: activityError } = await query
      if (activityError) throw activityError

      setActivities(((data ?? []) as Activity[]).filter((item) => !completedIds.has(item.id)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar a Central de Atividades.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [category])

  useEffect(() => {
    void load()
  }, [load])

  const selectedLevel = LEVELS.find((item) => item.value === level)
  const accuracy = completed ? Math.round((correct / completed) * 100) : 0
  const nextActivity = activities[activities.length - 1] ?? null

  const profileText = useMemo(() => {
    if (!profile) return 'Perfil ainda não identificado.'
    return [
      profile.nivel_conversacao ? 'Conversação: ' + profile.nivel_conversacao : null,
      profile.nivel_escrita ? 'Escrita: ' + profile.nivel_escrita : null,
      profile.nivel_compreensao ? 'Compreensão: ' + profile.nivel_compreensao : null,
    ].filter(Boolean).join('  •  ') || 'Níveis não informados.'
  }, [profile])

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando Central de Atividades...</Text>
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
          <Text style={styles.eyebrow}>PRÁTICA CONTÍNUA</Text>
          <Text style={styles.title}>Central de Atividades</Text>
          <Text style={styles.subtitle}>
            Uma biblioteca de atividades organizada por idioma e nível para você praticar no seu ritmo.
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={23} color={colors.white} />
        </View>
      </View>

      <AppCard elevated style={styles.profileCard}>
        <View style={styles.profileIcon}>
          <Ionicons name="school-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileEyebrow}>SEU PERFIL DE PRÁTICA</Text>
          <Text style={styles.profileName} numberOfLines={1}>{profile?.nome_completo || 'Aluno'}</Text>
          <Text style={styles.profileLevels}>{profileText}</Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeLabel}>NÍVEL</Text>
          <Text style={styles.levelBadgeValue}>{selectedLevel?.label || 'Iniciante'}</Text>
        </View>
      </AppCard>

      <AppCard elevated style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.summaryEyebrow}>SEU RESUMO</Text>
            <Text style={styles.summaryTitle}>Seu desempenho</Text>
          </View>
          <Ionicons name="trophy-outline" size={23} color={colors.primary} />
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{completed}</Text>
            <Text style={styles.statLabel}>Realizadas</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{accuracy}%</Text>
            <Text style={styles.statLabel}>Taxa de acertos</Text>
          </View>
        </View>
      </AppCard>

      <Text style={styles.sectionTitle}>Idioma e nível</Text>
      <View style={styles.languageRow}>
        {(['ingles', 'alemao'] as Language[]).map((item) => (
          <Pressable
            key={item}
            onPress={() => setLanguage(item)}
            style={[styles.languageButton, language === item && styles.languageButtonActive]}
          >
            <Ionicons name={item === 'ingles' ? 'flag-outline' : 'language-outline'} size={17} color={language === item ? colors.white : colors.primary} />
            <Text style={[styles.languageButtonText, language === item && styles.languageButtonTextActive]}>
              {LANGUAGE_LABELS[item]}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.levelRow}>
        {LEVELS.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setLevel(item.value)}
            style={[styles.levelButton, level === item.value && styles.levelButtonActive]}
          >
            <Text style={[styles.levelButtonText, level === item.value && styles.levelButtonTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Categoria</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        <Pressable
          onPress={() => setCategory('todas')}
          style={[styles.categoryChip, category === 'todas' && styles.categoryChipActive]}
        >
          <Text style={[styles.categoryText, category === 'todas' && styles.categoryTextActive]}>Todas</Text>
        </Pressable>
        {CATEGORIES.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setCategory(item.value)}
            style={[styles.categoryChip, category === item.value && styles.categoryChipActive]}
          >
            <Text style={[styles.categoryText, category === item.value && styles.categoryTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? (
        <View style={styles.error}>
          <Ionicons name="alert-circle-outline" size={19} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <AppCard elevated style={styles.startCard}>
        <View style={styles.startIcon}>
          <Ionicons name="sparkles-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.startEyebrow}>SUA PRÁTICA</Text>
        <Text style={styles.startTitle}>Pronto para praticar?</Text>
        <Text style={styles.startText}>
          Vamos começar uma sequência de atividades para {language ? LANGUAGE_LABELS[language] : 'seu idioma'} no nível {selectedLevel?.label || 'Iniciante'}.
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaChip}><Ionicons name="language-outline" size={14} color={colors.primary} /><Text style={styles.metaText}>{language ? LANGUAGE_LABELS[language] : 'Idioma'}</Text></View>
          <View style={styles.metaChip}><Ionicons name="school-outline" size={14} color={colors.primary} /><Text style={styles.metaText}>{selectedLevel?.label || 'Iniciante'}</Text></View>
          <View style={styles.metaChip}><Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} /><Text style={styles.metaText}>Sequência contínua</Text></View>
        </View>
        <Pressable
          disabled={!nextActivity}
          onPress={() => nextActivity && router.push({ pathname: '/(student)/central/atividade/[id]', params: { id: nextActivity.id } })}
          style={({ pressed }) => [styles.startButton, !nextActivity && styles.startButtonDisabled, pressed && styles.pressed]}
        >
          <Text style={styles.startButtonText}>{nextActivity ? 'Iniciar atividades' : 'Conteúdo em preparação'}</Text>
          <Ionicons name="arrow-forward" size={19} color={colors.white} />
        </Pressable>
      </AppCard>

      <View style={styles.howCard}>
        <View style={styles.howItem}><Text style={styles.howNumber}>1</Text><View><Text style={styles.howTitle}>Inicie</Text><Text style={styles.howText}>Comece sua prática.</Text></View></View>
        <View style={styles.howItem}><Text style={styles.howNumber}>2</Text><View><Text style={styles.howTitle}>Responda</Text><Text style={styles.howText}>Faça uma atividade por vez.</Text></View></View>
        <View style={styles.howItem}><Text style={styles.howNumber}>3</Text><View><Text style={styles.howTitle}>Avance</Text><Text style={styles.howText}>Siga para a próxima.</Text></View></View>
      </View>

      {!activities.length && !error ? (
        <AppCard style={styles.emptyCard}>
          <Ionicons name="book-outline" size={27} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Seu conteúdo está sendo preparado</Text>
          <Text style={styles.emptyText}>Ainda não há atividades publicadas para esta combinação de idioma e nível.</Text>
        </AppCard>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { ...typography.caption, color: colors.textSecondary },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xxl, paddingTop: 34, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.xl },
  headerCopy: { flex: 1, paddingRight: spacing.lg },
  eyebrow: { ...typography.overline, color: colors.primary },
  title: { ...typography.h1, color: colors.text, marginTop: 5 },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 6 },
  headerIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.lg },
  profileIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  profileCopy: { flex: 1, minWidth: 0 },
  profileEyebrow: { ...typography.overline, color: colors.textTertiary, fontSize: 8 },
  profileName: { ...typography.bodyMedium, color: colors.text, marginTop: 2 },
  profileLevels: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  levelBadge: { paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.border, minWidth: 72 },
  levelBadgeLabel: { ...typography.overline, color: colors.textTertiary, fontSize: 8 },
  levelBadgeValue: { color: colors.primary, fontSize: 14, fontWeight: '800', marginTop: 2 },
  summaryCard: { marginBottom: spacing.xl },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryEyebrow: { ...typography.overline, color: colors.textTertiary },
  summaryTitle: { ...typography.h3, color: colors.text, marginTop: 4 },
  stats: { flexDirection: 'row', marginTop: spacing.lg },
  stat: { flex: 1 },
  statValue: { fontSize: 24, lineHeight: 29, fontWeight: '800', color: colors.text },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  divider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },
  sectionTitle: { ...typography.overline, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.sm },
  languageRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  languageButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  languageButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  languageButtonText: { ...typography.bodyMedium, color: colors.primary },
  languageButtonTextActive: { color: colors.white },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  levelButton: { paddingHorizontal: 12, minHeight: 38, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, backgroundColor: colors.surface },
  levelButtonActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  levelButtonText: { ...typography.caption, color: colors.textSecondary },
  levelButtonTextActive: { color: colors.primary },
  categoryRow: { gap: spacing.sm, paddingBottom: 4 },
  categoryChip: { minHeight: 36, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { ...typography.caption, color: colors.textSecondary },
  categoryTextActive: { color: colors.white },
  error: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 13, borderRadius: radius.md, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: '#FECDCA', marginTop: spacing.lg },
  errorText: { ...typography.caption, color: colors.danger, flex: 1 },
  startCard: { marginTop: spacing.xl, padding: 22 },
  startIcon: { width: 58, height: 58, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  startEyebrow: { ...typography.overline, color: colors.primary },
  startTitle: { ...typography.h2, color: colors.text, marginTop: 5 },
  startText: { ...typography.body, color: colors.textSecondary, marginTop: 7 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: spacing.lg },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  metaText: { ...typography.caption, color: colors.textSecondary, fontSize: 10 },
  startButton: { minHeight: 50, marginTop: spacing.xl, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  startButtonDisabled: { opacity: 0.5 },
  startButtonText: { ...typography.bodyMedium, color: colors.white },
  howCard: { marginTop: spacing.md, padding: 17, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, gap: 15 },
  howItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  howNumber: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.primarySoft, color: colors.primary, textAlign: 'center', textAlignVertical: 'center', fontSize: 11, fontWeight: '900', overflow: 'hidden' },
  howTitle: { ...typography.bodyMedium, color: colors.text },
  howText: { ...typography.caption, color: colors.textTertiary, marginTop: 1 },
  emptyCard: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: 28 },
  emptyTitle: { ...typography.h3, color: colors.text, textAlign: 'center', marginTop: 12 },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 7 },
  pressed: { opacity: 0.75 },
})
