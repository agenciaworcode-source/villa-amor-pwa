import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { Resident } from '@/types'
import { AlertWithDetails } from '@/services/repositories/alert-repository'
import { DashboardRepository, AgendaItem } from '@/services/repositories/dashboard-repository'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const dashboardRepo = new DashboardRepository(supabase)

  const [dashData, agendaItems] = await Promise.all([
    dashboardRepo.getDashboardData(),
    dashboardRepo.getAgendaData(),
  ])
  const { residents, alerts, todayExecs, activeShift, activeStaffCount, todayIncidentCount } = dashData

  // Best status per resident: completed > in_progress > late > pending
  const STATUS_RANK: Record<string, number> = { completed: 4, in_progress: 3, late: 2, incomplete: 1, pending: 0 }
  const residentStatus: Record<string, string> = {}
  for (const e of todayExecs) {
    const cur = residentStatus[e.resident_id]
    if (!cur || (STATUS_RANK[e.status] ?? 0) > (STATUS_RANK[cur] ?? 0)) {
      residentStatus[e.resident_id] = e.status
    }
  }

  const total = residents.length
  const completedCount = Object.values(residentStatus).filter(s => s === 'completed').length
  const conformidade = total > 0 ? Math.round((completedCount / total) * 100) : 0

  const summary = {
    total_residents: total,
    completed_executions: completedCount,
    pending_residents: total - completedCount,
    recent_alerts: alerts,
    latest_executions: [],
  }

  return (
    <DashboardClient
      summary={summary}
      alerts={alerts}
      residents={residents}
      conformidade={conformidade}
      residentStatus={residentStatus}
      activeShiftType={activeShift?.type ?? null}
      activeStaffCount={activeStaffCount}
      todayIncidentCount={todayIncidentCount}
      agendaItems={agendaItems}
    />
  )
}
