import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { AudioSession, LiveKitRoom, VideoTrack, isTrackReference, useLocalParticipant, useParticipants, useRoomContext, useTracks } from '@livekit/react-native'
import { Track, RoomEvent } from 'livekit-client'
import { colors, radius, spacing, typography } from '@/constants/theme'
import { AppCard } from '@/components/AppCard'

type Lesson = { id: string; idioma: 'ingles' | 'alemao'; dia_semana: number; hora_inicio: string; hora_fim: string; disponivel: boolean }
type LiveKitData = { token: string; url: string; roomName: string; identity: string; name: string }

type ChatMessage = {
  id: string
  sender: string
  message: string
  mine: boolean
}

function languageName(language: string) {
  return language === 'ingles' ? 'Inglês' : 'Alemão'
}

function RoomContent({ lesson, onLeave }: { lesson: Lesson; onLeave: () => void }) {
  const room = useRoomContext()
  const participants = useParticipants()
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant()
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }])
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    void AudioSession.startAudioSession()
    return () => { void AudioSession.stopAudioSession() }
  }, [])

  useEffect(() => {
    const handleData = (payload: Uint8Array, participant?: { identity: string; name?: string }, _kind?: unknown, topic?: string) => {
      if (topic !== 'chat') return
      try {
        const parsed = JSON.parse(new TextDecoder().decode(payload)) as { message?: string; id?: string }
        if (!parsed.message) return
        if (!participant) return
        if (participant.identity === localParticipant.identity) return
        setChat((current) => current.concat({ id: parsed.id || String(Date.now()), sender: participant.name || participant.identity || 'Participante', message: parsed.message as string, mine: false }))
      } catch {
        // Ignora pacotes que não sejam mensagens de chat.
      }
    }
    room.on(RoomEvent.DataReceived, handleData)
    return () => { room.off(RoomEvent.DataReceived, handleData) }
  }, [localParticipant])

  async function toggleMicrophone() { await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled) }
  async function toggleCamera() { await localParticipant.setCameraEnabled(!isCameraEnabled) }

  async function sendMessage() {
    const text = message.trim()
    if (!text) return
    const id = String(Date.now()) + '-' + Math.random()
    const payload = new TextEncoder().encode(JSON.stringify({ id, message: text }))
    await localParticipant.publishData(payload, { reliable: true, topic: 'chat' })
    setChat((current) => current.concat({ id, sender: 'Você', message: text, mine: true }))
    setMessage('')
  }

  const visibleTracks = useMemo(() => tracks.filter((track) => isTrackReference(track)), [tracks])

  return (
    <View style={styles.room}>
      <View style={styles.roomHeader}>
        <View style={styles.brandBlock}><Text style={styles.brand}>AB ACADEMY</Text><Text style={styles.roomTitle}>Aula de {languageName(lesson.idioma)}</Text></View>
        <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>AO VIVO</Text></View>
      </View>
      <ScrollView style={styles.roomScroll} contentContainerStyle={styles.roomContent} showsVerticalScrollIndicator={false}>
        <View style={styles.videoArea}>
          {visibleTracks.length === 0 ? (
            <View style={styles.videoEmpty}><View style={styles.videoEmptyIcon}><Text style={styles.videoEmptyIconText}>◉</Text></View><Text style={styles.videoEmptyTitle}>Aguardando vídeo</Text><Text style={styles.videoEmptyText}>Ative sua câmera ou aguarde o professor entrar na sala.</Text></View>
          ) : (
            <View style={visibleTracks.length > 1 ? styles.videoGrid : styles.videoSingle}>
              {visibleTracks.map((trackRef) => (
                <View key={trackRef.participant.identity + '-' + trackRef.source} style={styles.videoTile}>
                  <VideoTrack trackRef={trackRef} style={styles.video} />
                  <View style={styles.videoName}><Text style={styles.videoNameText}>{trackRef.participant.isLocal ? 'Você' : trackRef.participant.name || trackRef.participant.identity}</Text></View>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={styles.controls}>
          <Pressable style={[styles.control, !isMicrophoneEnabled && styles.controlOff]} onPress={() => void toggleMicrophone()}><Text style={styles.controlIcon}>{isMicrophoneEnabled ? '🎤' : '🔇'}</Text><Text style={styles.controlLabel}>{isMicrophoneEnabled ? 'Microfone' : 'Mudo'}</Text></Pressable>
          <Pressable style={[styles.control, !isCameraEnabled && styles.controlOff]} onPress={() => void toggleCamera()}><Text style={styles.controlIcon}>{isCameraEnabled ? '📹' : '🚫'}</Text><Text style={styles.controlLabel}>{isCameraEnabled ? 'Câmera' : 'Desligada'}</Text></Pressable>
          <Pressable style={styles.leaveControl} onPress={onLeave}><Text style={styles.leaveControlText}>Sair</Text></Pressable>
        </View>
        <AppCard style={styles.participantsCard}>
          <View style={styles.cardHeader}><View><Text style={styles.cardEyebrow}>SALA</Text><Text style={styles.cardTitle}>Participantes</Text></View><View style={styles.countPill}><Text style={styles.countText}>{participants.length}</Text></View></View>
          {participants.map((participant) => (
            <View key={participant.identity} style={styles.participant}>
              <View style={styles.participantAvatar}><Text style={styles.participantAvatarText}>{(participant.name || participant.identity || 'A').charAt(0).toUpperCase()}</Text></View>
              <View style={styles.participantInfo}><Text style={styles.participantName}>{participant.isLocal ? 'Você' : participant.name || participant.identity}</Text><Text style={styles.participantRole}>{participant.isLocal ? 'Aluno' : 'Professor'}</Text></View>
              {participant.isSpeaking ? <View style={styles.speaking}><View style={styles.speakingDot} /><Text style={styles.speakingText}>Falando</Text></View> : null}
            </View>
          ))}
        </AppCard>
        <AppCard style={styles.chatCard}>
          <View style={styles.cardHeader}><View><Text style={styles.cardEyebrow}>COMUNICAÇÃO</Text><Text style={styles.cardTitle}>Chat da aula</Text></View></View>
          <View style={styles.chatMessages}>{chat.length === 0 ? <Text style={styles.chatEmpty}>Nenhuma mensagem ainda. Envie uma mensagem para iniciar a conversa.</Text> : chat.map((item) => <View key={item.id} style={[styles.chatMessage, item.mine && styles.chatMessageMine]}><Text style={styles.chatSender}>{item.sender}</Text><View style={[styles.chatBubble, item.mine && styles.chatBubbleMine]}><Text style={[styles.chatText, item.mine && styles.chatTextMine]}>{item.message}</Text></View></View>)}</View>
          <View style={styles.chatInputRow}><TextInput value={message} onChangeText={setMessage} onSubmitEditing={() => void sendMessage()} placeholder="Digite uma mensagem..." placeholderTextColor={colors.textTertiary} style={styles.chatInput} returnKeyType="send" /><Pressable style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]} onPress={() => void sendMessage()} disabled={!message.trim()}><Text style={styles.sendButtonText}>Enviar</Text></Pressable></View>
        </AppCard>
      </ScrollView>
    </View>
  )
}

export function LiveKitClassroom({ livekit, lesson, onLeave }: { livekit: LiveKitData; lesson: Lesson; onLeave: () => void }) {
  const [connected, setConnected] = useState(false)
  const [roomError, setRoomError] = useState('')
  return (
    <View style={styles.roomWrapper}>
      <LiveKitRoom serverUrl={livekit.url} token={livekit.token} connect audio video options={{ adaptiveStream: { pixelDensity: 'screen' } }} onConnected={() => { setRoomError(''); setConnected(true) }} onDisconnected={() => setConnected(false)} onError={(error) => setRoomError(error.message || 'Não foi possível conectar à sala.')}>
        <RoomContent lesson={lesson} onLeave={onLeave} />
        {!connected && !roomError ? <View style={styles.connectionOverlay}><ActivityIndicator size="small" color={colors.white} /><Text style={styles.connectionText}>Conectando à sala...</Text></View> : null}
        {roomError ? <View style={styles.connectionOverlay}><Text style={styles.connectionErrorTitle}>Não foi possível conectar</Text><Text style={styles.connectionErrorText}>{roomError}</Text><Pressable style={styles.retryButton} onPress={onLeave}><Text style={styles.retryButtonText}>Voltar</Text></Pressable></View> : null}
      </LiveKitRoom>
    </View>
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
  errorBox: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: '#FECDCA', borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.xxl },
  errorTitle: { ...typography.bodyMedium, color: colors.danger },
  errorText: { ...typography.caption, color: '#B42318', marginTop: 4 },
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
  connectionOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(9,11,16,0.92)', alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  connectionText: { ...typography.bodyMedium, color: colors.white, marginTop: spacing.md },
  connectionErrorTitle: { ...typography.h3, color: colors.white, textAlign: 'center' },
  connectionErrorText: { ...typography.body, color: '#D0D5DD', textAlign: 'center', marginTop: spacing.sm },
  retryButton: { minWidth: 120, height: 46, borderRadius: radius.md, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  retryButtonText: { color: colors.text, fontSize: 13, fontWeight: '800' },
})
