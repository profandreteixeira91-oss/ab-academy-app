import { supabase } from './supabase'

export async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Sessão do aluno não encontrada.')
  return data.user
}

export async function getStudentId(userId?: string) {
  const user = await getAuthenticatedUser()

  if (userId && user.id !== userId) {
    throw new Error('Sessão do aluno inválida.')
  }

  const email = user.email?.trim().toLowerCase()
  if (!email) throw new Error('O usuário autenticado não possui e-mail.')

  const { data, error } = await supabase.functions.invoke('student-auth', {
    body: { action: 'check-email', email },
  })

  if (error) throw error

  if (!data?.success || !data?.exists || !data?.aluno_id) {
    throw new Error(data?.error || 'Cadastro do aluno não encontrado.')
  }

  return data.aluno_id as string
}

export async function getStudentIdentity() {
  const user = await getAuthenticatedUser()
  const email = user.email?.trim().toLowerCase()

  if (!email) throw new Error('O usuário autenticado não possui e-mail.')

  const { data, error } = await supabase.functions.invoke('student-auth', {
    body: { action: 'check-email', email },
  })

  if (error) throw error
  if (!data?.success || !data?.exists || !data?.aluno_id) {
    throw new Error(data?.error || 'Cadastro do aluno não encontrado.')
  }

  return {
    user,
    studentId: data.aluno_id as string,
    name: data.nome_completo || user.user_metadata?.full_name || 'Aluno',
    avatar: user.user_metadata?.avatar_url || '',
  }
}

export function getNextLessonOccurrence(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
) {
  const now = new Date()
  const [startHours, startMinutes] = startTime.slice(0, 5).split(':').map(Number)
  const [endHours, endMinutes] = endTime.slice(0, 5).split(':').map(Number)

  if ([startHours, startMinutes, endHours, endMinutes].some(Number.isNaN)) {
    throw new Error('Horário de aula inválido.')
  }

  const currentDay = now.getDay()
  let daysUntil = dayOfWeek - currentDay
  if (daysUntil < 0) daysUntil += 7

  if (
    daysUntil === 0 &&
    (now.getHours() > endHours ||
      (now.getHours() === endHours && now.getMinutes() >= endMinutes))
  ) {
    daysUntil = 7
  }

  const startAt = new Date(now)
  startAt.setDate(now.getDate() + daysUntil)
  startAt.setHours(startHours, startMinutes, 0, 0)

  const endAt = new Date(startAt)
  endAt.setHours(endHours, endMinutes, 0, 0)

  return { startAt, endAt }
}

export function canEnterLesson(startAt: string, endAt: string) {
  const now = Date.now()
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()

  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    now >= start - 5 * 60 * 1000 &&
    now <= end
  )
}

export function formatBRDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('pt-BR')
}

export function formatBRDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
