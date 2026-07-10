import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { POP, Resident, ExecutionStatus } from '@/types'
import { TaskList } from '@/components/mobile/task-list'

export const dynamic = 'force-dynamic'

export default async function TarefasPage() {
  const cookieStore = cookies()
  const supabase    = createClient(cookieStore)

  const today = new Date().toISOString().split('T')[0]

  // ── 1. Usuário, role e todos os roles do colaborador ──────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = user?.user_metadata?.role as string | undefined
  let userRoles: string[] = []

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role, user_roles(role)')
      .eq('id', user.id)
      .single()

    if (profile) {
      userRole = userRole ?? (profile.role as string)
      userRoles = (profile.user_roles as { role: string }[] ?? []).map(r => r.role)
      if (userRoles.length === 0) userRoles = [userRole ?? '']
    }
  }

  // ── 2. POPs da profissão do colaborador (via pop_role_assignments) ─────────
  // Carrega todos os POPs ativos que têm algum role do colaborador vinculado e habilitado
  const { data: roleAssignmentData } = await supabase
    .from('pop_role_assignments')
    .select('pop_id')
    .in('role', userRoles.length > 0 ? userRoles : ['__none__'])
    .eq('enabled', true)

  const popIdsFromRoles = (roleAssignmentData ?? []).map(r => r.pop_id)

  // Fallback: também busca por role_type direto (compatibilidade com POPs antigos)
  const [
    { data: popsData },
    { data: residentsData },
  ] = await Promise.all([
    supabase
      .from('pops')
      .select(`
        id, name, shift_type, start_time_expected, deadline_time,
        tolerance_minutes, activation_window_minutes, late_permission_minutes,
        overlap_allowed, odd_days_only, role_type, requires_resident
      `)
      .eq('active', true)
      .or(
        popIdsFromRoles.length > 0
          ? `id.in.(${popIdsFromRoles.join(',')}),role_type.eq.${userRole ?? '__none__'}`
          : `role_type.eq.${userRole ?? '__none__'}`
      )
      .order('start_time_expected', { ascending: true, nullsFirst: false })
      .order('name'),
    supabase
      .from('residents')
      .select('id, name, room_number, photo_url, dependency_level')
      .eq('active', true)
      .order('name'),
  ])

  // Filtrar POPs de dias ímpares se hoje for dia par
  const todayDayOfMonth = new Date().getDate()
  const isOddDay = todayDayOfMonth % 2 !== 0

  const allPops = (popsData ?? []) as POP[]
  const pops = allPops.filter(p => !p.odd_days_only || isOddDay)
  const residents = (residentsData ?? []) as Pick<Resident, 'id' | 'name' | 'room_number' | 'photo_url' | 'dependency_level'>[]

  // ── 3. Execuções de hoje ──────────────────────────────────────────────────
  const { data: todayExecsData } = user
    ? await supabase
        .from('executions')
        .select('id, pop_id, resident_id, status, user_id')
        .gte('created_at', today)
    : { data: [] }

  const execLookup: Record<string, { execId: string; status: ExecutionStatus }> = {}
  for (const e of (todayExecsData ?? [])) {
    const key = `${e.pop_id}:${e.resident_id ?? 'no-resident'}`
    const cur = execLookup[key]
    const rank: Record<string, number> = { completed: 4, in_progress: 3, late: 2, incomplete: 1, pending: 0 }
    if (!cur || (rank[e.status] ?? 0) > (rank[cur.status] ?? 0)) {
      execLookup[key] = { execId: e.id, status: e.status as ExecutionStatus }
    }
  }

  // Verifica se usuário tem POP em andamento (para regra de sobreposição)
  const hasActiveExecution = (todayExecsData ?? []).some(
    e => e.user_id === user?.id && e.status === 'in_progress'
  )

  // Hora atual em minutos (horário de Brasília UTC-3)
  const nowBrazilMinutes = (() => {
    const now = new Date(Date.now() - 3 * 60 * 60 * 1000)
    return now.getUTCHours() * 60 + now.getUTCMinutes()
  })()

  return (
    <TaskList
      pops={pops}
      residents={residents}
      execLookup={execLookup}
      nowMinutes={nowBrazilMinutes}
      hasActiveExecution={hasActiveExecution}
      userId={user?.id ?? ''}
    />
  )
}
