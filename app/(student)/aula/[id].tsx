import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Constants from 'expo-constants'
import { router, useLocalSearchParams } from 'expo-router'
import { canEnterLesson, getNextLessonOccurrence, getStudentId } from '@/lib/student'
import { supabase } from '@/lib/supabase'
import { colors, radius, spacing, typography } from '@/constants/theme'
import { AppCard } from '@/components/AppCard'

type Lesson = { id: string; idioma: 'ingles' | 'alemao'; dia_semana: number; hora_inicio: string; hora_fim: string; disponivel: boolean }
type LiveKitData = { token: string; url: string; roomName: string; identity: string; name: string }

function languageName(language: string) { return language === 'ingles' ? 'Inglês' : 'Alemão' }
function formatTime(value: string) { return value?.slice(0, 5) || value }

export default function LessonRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [livekit, setLivekit] = useState<LiveKitData | null>(null)
  const [allowed, setAllowed] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [LiveKitClassroom, setLiveKitClassroom] = useState<React.ComponentType<{ livekit: LiveKitData; lesson: Lesson; onLeave: () => void }> | null>(null)

  async function load() {
    try {
      setLoading(true); setError('')
      const studentId = await getStudentId()
      const { data, error: queryError } = await supabase.from('horarios').select('id, idioma, dia_semana, hora_inicio, hora_fim, disponivel').eq('id', id).eq('aluno_id', studentId).single()
      if (queryError) throw queryError
      const next = getNextLessonOccurrence(Number(data.dia_semana), data.hora_inicio, data.hora_fim)
      const canEnter = canEnterLesson(next.startAt.toISOString(), next.endAt.toISOString())
      setLesson(data); setAllowed(canEnter)
      if (!canEnter) setMessage('O acesso à sala é liberado 5 minutos antes do início da aula.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar a aula.') } finally { setLoading(false) }
  }

  useEffect(() => {
    void load()
    const timer = setInterval(() => { void load() }, 30000)
    return () => clearInterval(timer)
  }, [id])

  useEffect(() => {
    if (!livekit || Constants.appOwnership === 'expo') return
    let active = true
    void import('@/components/LiveKitClassroom').then((module) => {
      if (active) setLiveKitClassroom(() => module.default)
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : 'O módulo da sala virtual não está disponível neste dispositivo.')
    })
    return () => { active = false }
  }, [livekit])

  async function enterRoom() {
    if (!lesson) return
    if (Constants.appOwnership === 'expo') {
      setError('A sala virtual LiveKit precisa do Development Build. O restante do aplicativo pode ser testado normalmente no Expo Go.')
      return
    }
    try {
      setConnecting(true)
      setError('')
      console.log('[AB ACADEMY] CHAMANDO livekit-token', { lessonId: lesson.id, allowed })
      const { data, error: functionError } = await supabase.functions.invoke('livekit-token', { body: { lessonId: lesson.id } })
      console.log('[AB ACADEMY] RESPOSTA livekit-token', { data, error: functionError })
      if (functionError) throw new Error(functionError.message || 'Erro ao chamar a função livekit-token.')
      if (!data?.token || !data?.url) throw new Error(data?.error || 'A função livekit-token não retornou os dados da sala.')
      setLivekit(data)
    } catch (err) {
      console.error('[AB ACADEMY] ERRO livekit-token', err)
      setError(err instanceof Error ? err.message : 'Não foi possível conectar à sala.')
    } finally {
      setConnecting(false)
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.loadingText}>Carregando sala de aula...</Text></View>
  if (livekit && lesson && LiveKitClassroom) return <LiveKitClassroom livekit={livekit} lesson={lesson} onLeave={() => setLivekit(null)} />

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.preRoomContent} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.backButton} onPress={() => router.back()}><Text style={styles.backText}>‹  Voltar</Text></Pressable>
      <View style={styles.preHeader}><Text style={styles.eyebrow}>SALA VIRTUAL</Text><Text style={styles.title}>{lesson ? 'Aula de ' + languageName(lesson.idioma) : 'Sala de aula'}</Text><Text style={styles.subtitle}>Sua aula acontece diretamente dentro do AB Academy.</Text></View>
      {error ? <View style={styles.errorBox}><Text style={styles.errorTitle}>Não foi possível acessar</Text><Text style={styles.errorText}>{error}</Text></View> : null}
      {lesson ? <AppCard elevated style={styles.preRoomCard}>
        <View style={styles.preRoomIcon}><Text style={styles.preRoomIconText}>▶</Text></View>
        <Text style={styles.preRoomLabel}>AB ACADEMY LIVE</Text><Text style={styles.preRoomTitle}>Sala de videoconferência</Text><Text style={styles.preRoomDescription}>Vídeo, áudio, participantes e chat em uma única sala.</Text>
        <View style={styles.lessonInfo}><View style={styles.lessonInfoItem}><Text style={styles.lessonInfoLabel}>HORÁRIO</Text><Text style={styles.lessonInfoValue}>{formatTime(lesson.hora_inicio)} — {formatTime(lesson.hora_fim)}</Text></View><View style={styles.lessonInfoItem}><Text style={styles.lessonInfoLabel}>IDIOMA</Text><Text style={styles.lessonInfoValue}>{languageName(lesson.idioma)}</Text></View></View>
        <Pressable style={[styles.enterButton, connecting && styles.enterButtonDisabled]} onPress={() => void enterRoom()} disabled={connecting}><Text style={styles.enterButtonText}>{connecting ? 'Conectando...' : 'Entrar na aula'}</Text></Pressable>
        <Text style={styles.accessMessage}>{allowed ? 'A sala está disponível agora.' : message || 'O acesso será liberado 5 minutos antes.'}</Text>
      </AppCard> : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xxl },
  loadingText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  container: { flex: 1, backgroundColor: colors.background },
  preRoomContent: { padding: spacing.xxl, paddingTop: 54, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start', marginBottom: spacing.xxl },
  backText: { ...typography.bodyMedium, color: colors.textSecondary },
  preHeader: { marginBottom: spacing.xxl },
  eyebrow: { ...typography.overline, color: colors.textSecondary },
  title: { ...typography.h1, color: colors.text, marginTop: 6 },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 6 },
  errorBox: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.xxl },
  errorTitle: { ...typography.bodyMedium, color: colors.danger },
  errorText: { ...typography.caption, color: colors.danger, marginTop: 4 },
  preRoomCard: { alignItems: 'center', paddingVertical: 32 },
  preRoomIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  preRoomIconText: { color: colors.white, fontSize: 22, fontWeight: '800' },
  preRoomLabel: { ...typography.overline, color: colors.textSecondary },
  preRoomTitle: { ...typography.h2, color: colors.text, textAlign: 'center', marginTop: 5 },
  preRoomDescription: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 7 },
  lessonInfo: { width: '100%', flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xxl, paddingTop: spacing.lg },
  lessonInfoItem: { flex: 1 },
  lessonInfoLabel: { ...typography.overline, color: colors.textTertiary, fontSize: 9 },
  lessonInfoValue: { ...typography.bodyMedium, color: colors.text, marginTop: 3 },
  enterButton: { width: '100%', minHeight: 54, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xxl },
  enterButtonDisabled: { backgroundColor: colors.borderStrong },
  enterButtonText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  accessMessage: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
  roomWrapper: { flex: 1, backgroundColor: '#090B10' },
  liveKitRoom: { flex: 1 },
  room: { flex: 1, backgroundColor: '#090B10' },
  roomHeader: { minHeight: 74, paddingHorizontal: spacing.lg, paddingTop: 14, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#10131A', borderBottomWidth: 1, borderBottomColor: '#252A34' },
  brandBlock: { flex: 1 },
  brand: { fontSize: 10, lineHeight: 14, letterSpacing: 1.4, fontWeight: '800', color: '#98A2B3' },
  roomTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800', color: colors.white, marginTop: 2 },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1D3328', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7, marginLeft: spacing.sm },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#32D583', marginRight: 6 },
  liveText: { fontSize: 9, fontWeight: '800', color: '#6CE9A6', letterSpacing: 0.8 },
  roomScroll: { flex: 1 },
  roomContent: { padding: spacing.md, paddingBottom: 32 },
  videoArea: { minHeight: 280, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#161A22', borderWidth: 1, borderColor: '#252A34' },
  videoSingle: { flex: 1, minHeight: 280 },
  videoGrid: { minHeight: 280, flexDirection: 'row', flexWrap: 'wrap' },
  videoTile: { minHeight: 280, flex: 1, minWidth: '48%', backgroundColor: '#11141B', position: 'relative' },
  video: { flex: 1, minHeight: 280 },
  videoName: { position: 'absolute', left: 10, bottom: 10, backgroundColor: 'rgba(0,0,0,0.58)', borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 6 },
  videoNameText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  videoEmpty: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  videoEmptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#222834', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  videoEmptyIconText: { color: '#98A2B3', fontSize: 20 },
  videoEmptyTitle: { ...typography.h3, color: colors.white },
  videoEmptyText: { ...typography.caption, color: '#98A2B3', textAlign: 'center', marginTop: 5, maxWidth: 300 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  control: { minWidth: 84, minHeight: 58, borderRadius: radius.md, backgroundColor: '#1B202A', borderWidth: 1, borderColor: '#303746', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  controlOff: { backgroundColor: '#342327', borderColor: '#553238' },
  controlIcon: { fontSize: 19 },
  controlLabel: { fontSize: 9, fontWeight: '700', color: '#D0D5DD', marginTop: 3 },
  leaveControl: { minWidth: 72, minHeight: 58, borderRadius: radius.md, backgroundColor: '#D92D20', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  leaveControlText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  participantsCard: { marginBottom: spacing.md },
  chatCard: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  cardEyebrow: { ...typography.overline, color: colors.textTertiary, fontSize: 9 },
  cardTitle: { ...typography.h3, color: colors.text, marginTop: 2 },
  countPill: { minWidth: 30, height: 30, paddingHorizontal: 8, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, fontWeight: '800', color: colors.text },
  participant: { minHeight: 56, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  participantAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  participantAvatarText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  participantInfo: { flex: 1 },
  participantName: { ...typography.bodyMedium, color: colors.text },
  participantRole: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  speaking: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5 },
  speakingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success, marginRight: 5 },
  speakingText: { fontSize: 9, fontWeight: '800', color: colors.success },
  chatMessages: { maxHeight: 280, marginBottom: spacing.md },
  chatEmpty: { ...typography.caption, color: colors.textSecondary, paddingVertical: spacing.md },
  chatMessage: { alignItems: 'flex-start', marginBottom: spacing.sm },
  chatMessageMine: { alignItems: 'flex-end' },
  chatSender: { fontSize: 10, fontWeight: '700', color: colors.textTertiary, marginBottom: 3 },
  chatBubble: { maxWidth: '88%', backgroundColor: colors.primarySoft, borderRadius: radius.md, paddingHorizontal: 11, paddingVertical: 8 },
  chatBubbleMine: { backgroundColor: colors.primary },
  chatText: { ...typography.caption, color: colors.text },
  chatTextMine: { color: colors.white },
  chatInputRow: { flexDirection: 'row', alignItems: 'center' },
  chatInput: { flex: 1, height: 46, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: 12, color: colors.text, backgroundColor: colors.surface },
  sendButton: { height: 46, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  sendButtonDisabled: { backgroundColor: colors.borderStrong },
  sendButtonText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  connectionOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9,11,16,0.92)', alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  connectionText: { ...typography.bodyMedium, color: colors.white, marginTop: spacing.md },
  connectionErrorTitle: { ...typography.h3, color: colors.white, textAlign: 'center' },
  connectionErrorText: { ...typography.body, color: '#D0D5DD', textAlign: 'center', marginTop: spacing.sm },
  retryButton: { minWidth: 120, height: 46, borderRadius: radius.md, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  retryButtonText: { color: colors.text, fontSize: 13, fontWeight: '800' },
})
