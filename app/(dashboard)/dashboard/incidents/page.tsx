import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { IncidentsClient } from '@/components/dashboard/incidents-client'
import { Resident } from '@/types'
import { Incident } from '@/services/repositories/incident-repository'

export const dynamic = 'force-dynamic'

export default async function IncidentsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const [{ data: incidents }, { data: residents }] = await Promise.all([
    supabase
      .from('incidents')
      .select('*, resident:residents(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('residents')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true }),
  ])

  return (
    <IncidentsClient
      incidents={(incidents ?? []) as Incident[]}
      residents={(residents ?? []) as Resident[]}
    />
  )
}
