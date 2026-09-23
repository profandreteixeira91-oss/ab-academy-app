import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { canEnterLesson, getNextLessonOccurrence, getStudentIdentity } from '@/lib/student'
import { supabase } from '@/lib/supabase'

type Lesson = { id: string; language: string; date: string; time: string; teacher: string; startAt: string; endAt: string; meetUrl?: string }

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
      const { data: horarios, error: horariosError } = await supabase.from('horarios').select('id, idioma, dia_semana, hora_inicio, hora_fim, professor_id, meet_url').eq('aluno_id', identity.studentId)
      if (horariosError) throw horariosError
      const professorIds = Array.from(new Set((horarios ?? []).map(item => item.professor_id).filter(Boolean)))
      const { data: professores, error: professoresError } = professorIds.length ? await supabase.from('professores').select('id, nome_completo').in('id', professorIds) : { data: [], error: null }
      if (professoresError) throw professoresError
      const professorMap = new Map((professores ?? []).map(item => [item.id, item.nome_completo]))
      const lessons: Lesson[] = (horarios ?? []).map(item => {
        const { startAt, endAt } = getNextLessonOccurrence(Number(item.dia_semana), item.hora_inicio, item.hora_fim)
        return { id: item.id, language: item.idioma === 'ingles' ? 'Inglês' : 'Alemão', date: startAt.toLocaleDateString('pt-BR'), time: item.hora_inicio.slice(0, 5), teacher: professorMap.get(item.professor_id) || 'Professor', startAt: startAt.toISOString(), endAt: endAt.toISOString(), meetUrl: item.meet_url || undefined }
      }).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      setNextLesson(lessons[0] ?? null)
      const { count, error: activitiesError } = await supabase.from('atividades').select('id', { count: 'exact', head: true }).eq('aluno_id', identity.studentId).neq('status', 'rascunho')
      if (activitiesError) throw activitiesError
      setActivitiesCount(count ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o portal.')
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  const lessonReady = useMemo(() => nextLesson ? canEnterLesson(nextLesson.startAt, nextLesson.endAt) : false, [nextLesson])

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" /></View>

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} />}>
    <Text style={styles.eyebrow}>PORTAL DO ALUNO</Text>
    <Text style={styles.title}>Olá, {name.split(' ')[0]}!</Text>
    <Text style={styles.subtitle}>Acompanhe suas aulas, atividades e progresso.</Text>
    {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>PRÓXIMA AULA</Text>
      {nextLesson ? <>
        <Text style={styles.cardTitle}>{nextLesson.language}</Text>
        <Text style={styles.lessonMeta}>{nextLesson.date} • {nextLesson.time}</Text>
        <Text style={styles.lessonTeacher}>Professor: {nextLesson.teacher}</Text>
        <Pressable style={[styles.button, !lessonReady && styles.buttonDisabled]} disabled={!lessonReady} onPress={() => router.push({ pathname: '/(student)/aula/[id]', params: { id: nextLesson.id } })}>
          <Text style={styles.buttonText}>{lessonReady ? 'Entrar na aula' : 'Acesso liberado 5 min antes'}</Text>
        </Pressable>
      </> : <><Text style={styles.cardTitle}>Nenhuma aula agendada</Text><Text style={styles.lessonMeta}>Sua próxima aula aparecerá aqui.</Text></>}
    </View>
    <View style={styles.grid}>
      <Pressable style={styles.statCard} onPress={() => router.push('/(student)/atividades')}><Text style={styles.statNumber}>{activitiesCount}</Text><Text style={styles.statLabel}>Atividades disponíveis</Text></Pressable>
      <Pressable style={styles.statCard} onPress={() => router.push('/(student)/aulas')}><Text style={styles.statNumber}>›</Text><Text style={styles.statLabel}>Ver minhas aulas</Text></Pressable>
    </View>
  </ScrollView>
}
const styles = StyleSheet.create({
 loading:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#f6f7fb'},container:{flex:1,backgroundColor:'#f6f7fb'},content:{padding:24,paddingTop:52,paddingBottom:36},eyebrow:{fontSize:12,fontWeight:'800',letterSpacing:1.2,color:'#667085'},title:{fontSize:30,fontWeight:'800',color:'#111827',marginTop:8},subtitle:{fontSize:15,lineHeight:22,color:'#667085',marginTop:6,marginBottom:22},card:{backgroundColor:'#fff',borderRadius:22,padding:22,marginBottom:16},cardEyebrow:{fontSize:11,fontWeight:'800',letterSpacing:1.1,color:'#667085'},cardTitle:{fontSize:22,fontWeight:'800',color:'#111827',marginTop:8},lessonMeta:{fontSize:15,color:'#475467',marginTop:8},lessonTeacher:{fontSize:14,color:'#667085',marginTop:6},button:{marginTop:18,height:50,borderRadius:14,backgroundColor:'#111827',alignItems:'center',justifyContent:'center',paddingHorizontal:14},buttonDisabled:{opacity:0.45},buttonText:{color:'#fff',fontWeight:'700',fontSize:14},grid:{flexDirection:'row',gap:12},statCard:{flex:1,backgroundColor:'#fff',borderRadius:20,padding:20,minHeight:110},statNumber:{fontSize:26,fontWeight:'800',color:'#111827'},statLabel:{marginTop:8,fontSize:13,lineHeight:18,color:'#667085'},error:{backgroundColor:'#fff1f2',borderRadius:14,padding:14,marginBottom:16},errorText:{color:'#be123c',fontSize:13,lineHeight:19}
})
