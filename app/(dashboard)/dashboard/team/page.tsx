import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { TeamClient } from '@/components/dashboard/team-client'
import { UserProfile } from '@/types'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: raw } = await supabase
    .from('users')
    .select('*, user_roles(role, is_primary)')
    .eq('active', true)
    .order('name', { ascending: true })

  const data = (raw ?? []).map((u: Record<string, unknown>) => ({
    ...u,
    roles: (u.user_roles as { role: string; is_primary: boolean }[] | null) ?? [],
  }))

  return <TeamClient users={(data ?? []) as UserProfile[]} />
}
