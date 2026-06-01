import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { POPsClient } from '@/components/dashboard/pops-client'
import { POP } from '@/types'

export const dynamic = 'force-dynamic'

export default async function POPsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('pops')
    .select('*')
    .order('name', { ascending: true })

  return <POPsClient pops={(data ?? []) as POP[]} />
}
