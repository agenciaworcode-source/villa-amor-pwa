import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { ReportsClient } from '@/components/dashboard/reports-client'

type ExecRow = {
  id: string; status: string; started_at: string | null; completed_at: string | null
  resident_id: string; pop_id: string
  resident: { id: string; name: string; room_number: string } | null
  pop: { id: string; name: string } | null
  user: { id: string; name: string } | null
}

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceISO = since.toISOString()

  const [{ data: executions }, { data: residents }, { data: incidents }] = await Promise.all([
    supabase
      .from('executions')
      .select('id, status, started_at, completed_at, resident_id, pop_id, resident:residents(id, name, room_number), pop:pops(id, name), user:users(id, name)')
      .gte('created_at', sinceISO)
      .order('started_at', { ascending: false }),
    supabase
      .from('residents')
      .select('id, name, room_number')
      .eq('active', true)
      .order('name'),
    supabase
      .from('incidents')
      .select('id, resident_id, severity, occurred_at')
      .gte('occurred_at', sinceISO),
  ])

  return (
    <ReportsClient
      executions={(executions ?? []) as unknown as ExecRow[]}
      residents={residents ?? []}
      incidents={incidents ?? []}
    />
  )
}
