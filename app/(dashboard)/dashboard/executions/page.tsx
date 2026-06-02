import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { ExecutionsClient } from '@/components/dashboard/executions-client'

export const dynamic = 'force-dynamic'

export default async function ExecutionsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Busca execuções das últimas 36h (cobre fuso UTC-3 do Brasil)
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('executions')
    .select(`
      *,
      resident:residents(*),
      pop:pops(*),
      user:users(id, name),
      steps:execution_steps(
        id, status, completed_at,
        pop_step:pop_steps(title, order_index, is_mandatory)
      )
    `)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)

  return <ExecutionsClient executions={data ?? []} />
}
