import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { ResidentsClient } from '@/components/dashboard/residents-client'
import { Resident } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ResidentsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('residents')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })

  return <ResidentsClient residents={(data ?? []) as Resident[]} />
}
