import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { POPDetailClient } from '@/components/dashboard/pop-detail-client'
import { POP, POPBlock, POPStep, Resident, UserProfile, POPStaffRotation } from '@/types'

export const dynamic = 'force-dynamic'

export default async function POPDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const [
    { data: pop },
    { data: blocks },
    { data: assignedRows },
    { data: allResidents },
    { data: rotationRows },
    { data: allMultiprofessionals },
  ] = await Promise.all([
    supabase.from('pops').select('*').eq('id', params.id).single(),
    supabase
      .from('pop_blocks')
      .select('*, steps:pop_steps(*)')
      .eq('pop_id', params.id)
      .order('order_index', { ascending: true }),
    supabase
      .from('resident_pop_assignments')
      .select('resident_id')
      .eq('pop_id', params.id)
      .eq('active', true),
    supabase
      .from('residents')
      .select('id, name, room_number, dependency_level, is_bedridden')
      .eq('active', true)
      .order('name'),
    supabase
      .from('pop_staff_rotation')
      .select('*, user:users(id, name, email, role, active)')
      .eq('pop_id', params.id)
      .eq('active', true)
      .order('order_index', { ascending: true }),
    supabase
      .from('users')
      .select('id, name, email, role, active')
      .eq('active', true)
      .not('role', 'in', '("admin","supervisor")')
      .order('name'),
  ])

  if (!pop) notFound()

  const blocksWithSteps = (blocks ?? []).map(b => ({
    ...b,
    steps: [...(b.steps ?? [])].sort((a, b) => a.order_index - b.order_index),
  }))

  const assignedResidentIds = new Set((assignedRows ?? []).map(r => r.resident_id))

  return (
    <POPDetailClient
      pop={pop as POP}
      initialBlocks={blocksWithSteps as (POPBlock & { steps: POPStep[] })[]}
      allResidents={(allResidents ?? []) as Pick<Resident, 'id' | 'name' | 'room_number' | 'dependency_level' | 'is_bedridden'>[]}
      initialAssignedIds={Array.from(assignedResidentIds)}
      initialRotation={(rotationRows ?? []) as POPStaffRotation[]}
      allStaff={(allMultiprofessionals ?? []) as UserProfile[]}
    />
  )
}
