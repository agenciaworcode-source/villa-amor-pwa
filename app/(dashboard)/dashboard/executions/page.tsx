import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { ExecutionsClient } from '@/components/dashboard/executions-client'

export const dynamic = 'force-dynamic'

export default async function ExecutionsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('executions')
    .select('*, resident:residents(*), pop:pops(*), user:users(id, name)')
    .order('created_at', { ascending: false })
    .limit(50)

  return <ExecutionsClient executions={data ?? []} />
}
