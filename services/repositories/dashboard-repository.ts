import { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/utils/supabase/client'
import { Execution, Resident, POP, ExecutionStep, MediaFile, POPStep, ShiftType } from '@/types'
import { AlertWithDetails } from './alert-repository'

export interface AgendaResidentItem {
  residentId: string
  residentName: string
  roomNumber: string
  executionStatus: string | null
}

export interface AgendaItem {
  popId: string
  popName: string
  startTime: string | null
  deadlineTime: string | null
  roleType: string
  shiftType: string
  assignedUserName: string | null
  assignedUserId: string | null
  residents: AgendaResidentItem[]
  completedCount: number
  totalCount: number
}

export interface ShiftSummary {
  total_residents: number
  completed_executions: number
  pending_residents: number
  recent_alerts: AlertWithDetails[]
  latest_executions: (Execution & { resident: Resident; pop: POP })[]
}

export interface DashboardData {
  residents: Resident[]
  alerts: AlertWithDetails[]
  todayExecs: { resident_id: string; status: string }[]
  activeShift: { type: ShiftType } | null
  activeStaffCount: number
  todayIncidentCount: number
}

export class DashboardRepository {
  constructor(private supabase: SupabaseClient = defaultClient) {}

  async getDashboardData(): Promise<DashboardData> {
    const todayISO = new Date().toISOString().split('T')[0]

    const [
      { data: residents },
      { data: alerts },
      { data: todayExecs },
      { data: activeShift },
      { count: activeStaffCount },
      { count: todayIncidentCount },
    ] = await Promise.all([
      this.supabase.from('residents').select('*').eq('active', true).order('name'),
      this.supabase.from('alerts').select('*, resident:residents(*)').is('acknowledged_at', null).order('triggered_at', { ascending: false }),
      this.supabase.from('executions').select('resident_id, status').gte('created_at', todayISO),
      this.supabase.from('shifts').select('type').eq('date', todayISO).is('ended_at', null).maybeSingle(),
      this.supabase.from('users').select('*', { count: 'exact', head: true }).eq('active', true).not('role', 'in', '("admin","supervisor")'),
      this.supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('occurred_at', todayISO),
    ])

    return {
      residents: (residents ?? []) as Resident[],
      alerts: (alerts ?? []) as AlertWithDetails[],
      todayExecs: (todayExecs ?? []) as { resident_id: string; status: string }[],
      activeShift: activeShift as { type: ShiftType } | null,
      activeStaffCount: activeStaffCount ?? 0,
      todayIncidentCount: todayIncidentCount ?? 0,
    }
  }

  async getAgendaData(): Promise<AgendaItem[]> {
    const todayISO = new Date().toISOString().split('T')[0]

    // 1. POPs ativos com horário definido
    const { data: pops } = await this.supabase
      .from('pops')
      .select('id, name, start_time_expected, deadline_time, role_type, shift_type, tolerance_minutes')
      .eq('active', true)
      .not('start_time_expected', 'is', null)
      .order('start_time_expected', { ascending: true })

    if (!pops || pops.length === 0) return []

    const popIds = pops.map(p => p.id)

    // 2. Rodízio — todos os colaboradores de cada POP
    const { data: rotations } = await this.supabase
      .from('pop_staff_rotation')
      .select('pop_id, user_id, last_assigned_date, user:users(id, name)')
      .in('pop_id', popIds)
      .eq('active', true)
      .order('last_assigned_date', { ascending: true, nullsFirst: true })

    // 3. Atribuições de residentes
    const { data: assignments } = await this.supabase
      .from('resident_pop_assignments')
      .select('pop_id, resident_id, resident:residents(id, name, room_number)')
      .in('pop_id', popIds)
      .eq('active', true)

    // 4. Execuções de hoje
    const { data: todayExecs } = await this.supabase
      .from('executions')
      .select('pop_id, resident_id, status')
      .gte('created_at', todayISO)

    // Computar: quem é o próximo no rodízio por POP
    const nextUserByPop: Record<string, { userId: string; userName: string }> = {}
    for (const r of rotations ?? []) {
      if (!nextUserByPop[r.pop_id]) {
        nextUserByPop[r.pop_id] = {
          userId: r.user_id,
          userName: (r.user as unknown as { id: string; name: string } | null)?.name ?? 'Colaborador',
        }
      }
    }

    // Status de execução por (pop_id, resident_id)
    const STATUS_RANK: Record<string, number> = { completed: 4, in_progress: 3, late: 2, incomplete: 1, pending: 0 }
    const execStatus: Record<string, string> = {}
    for (const e of todayExecs ?? []) {
      const key = `${e.pop_id}__${e.resident_id}`
      const cur = execStatus[key]
      if (!cur || (STATUS_RANK[e.status] ?? 0) > (STATUS_RANK[cur] ?? 0)) {
        execStatus[key] = e.status
      }
    }

    // Residentes por POP
    const residentsByPop: Record<string, AgendaResidentItem[]> = {}
    for (const a of assignments ?? []) {
      if (!residentsByPop[a.pop_id]) residentsByPop[a.pop_id] = []
      const res = a.resident as unknown as { id: string; name: string; room_number: string } | null
      const status = execStatus[`${a.pop_id}__${a.resident_id}`] ?? null
      residentsByPop[a.pop_id].push({
        residentId: a.resident_id,
        residentName: res?.name ?? '',
        roomNumber: res?.room_number ?? '',
        executionStatus: status,
      })
    }

    return pops.map(pop => {
      const residents = residentsByPop[pop.id] ?? []
      const assigned = nextUserByPop[pop.id] ?? null
      const completedCount = residents.filter(r => r.executionStatus === 'completed').length
      return {
        popId: pop.id,
        popName: pop.name,
        startTime: pop.start_time_expected ? (pop.start_time_expected as string).slice(0, 5) : null,
        deadlineTime: pop.deadline_time ? (pop.deadline_time as string).slice(0, 5) : null,
        roleType: pop.role_type,
        shiftType: pop.shift_type,
        assignedUserName: assigned?.userName ?? null,
        assignedUserId: assigned?.userId ?? null,
        residents,
        completedCount,
        totalCount: residents.length,
      }
    }).filter(item => item.totalCount > 0)
  }

  async getExecutionDetails(id: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('executions')
      .select(`
        *,
        resident:residents(*),
        pop:pops(*),
        steps:execution_steps(
          *,
          pop_step:pop_steps(*),
          media:media_files(*)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }
}

export const dashboardRepository = new DashboardRepository()
