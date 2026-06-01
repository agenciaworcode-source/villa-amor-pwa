import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { TeamClient } from '@/components/dashboard/team-client'
import { UserProfile } from '@/types'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })

  return <TeamClient users={(data ?? []) as UserProfile[]} />
}
