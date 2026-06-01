import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { POP, Resident, ExecutionStatus } from '@/types'
import { TaskList } from '@/components/mobile/task-list'

export const dynamic = 'force-dynamic'

export default async function TarefasPage() {
  const cookieStore = cookies()
  const supabase    = createClient(cookieStore)

  const today = new Date().toISOString().split('T')[0]

  // ── 1. Usuário e role ──────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = user?.user_metadata?.role as string | undefined
  if (!userRole && user) {
    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    userRole = profile?.role as string | undefined
  }

  const [
    { data: popsData },
    { data: residentsData },
  ] = await Promise.all([
    supabase
      .from('pops')
      .select('id, name, shift_type, start_time_expected, deadline_time, tolerance_minutes, role_type')
      .eq('active', true)
      .eq('role_type', userRole ?? '')
      .order('start_time_expected', { ascending: true, nullsFirst: false })
      .order('name'),
    supabase
      .from('residents')
      .select('id, name, room_number, photo_url, dependency_level')
      .eq('active', true)
      .order('name'),
  ])

  const pops      = (popsData      ?? []) as POP[]
  const residents = (residentsData ?? []) as Pick<Resident, 'id' | 'name' | 'room_number' | 'photo_url' | 'dependency_level'>[]

  // today's executions — all, for status lookup
  const { data: todayExecsData } = user
    ? await supabase
        .from('executions')
        .select('id, pop_id, resident_id, status')
        .gte('created_at', today)
    : { data: [] }

  // build lookup: `${pop_id}:${resident_id}` → { execId, status }
  // POPs sem residente usam chave `${pop_id}:no-resident`
  const execLookup: Record<string, { execId: string; status: ExecutionStatus }> = {}
  for (const e of (todayExecsData ?? [])) {
    const key = `${e.pop_id}:${e.resident_id ?? 'no-resident'}`
    const cur = execLookup[key]
    // keep highest-rank status
    const rank: Record<string, number> = { completed: 4, in_progress: 3, late: 2, incomplete: 1, pending: 0 }
    if (!cur || (rank[e.status] ?? 0) > (rank[cur.status] ?? 0)) {
      execLookup[key] = { execId: e.id, status: e.status as ExecutionStatus }
    }
  }

  return (
    <TaskList
      pops={pops}
      residents={residents}
      execLookup={execLookup}
    />
  )
}
