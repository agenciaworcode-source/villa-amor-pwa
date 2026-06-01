import { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/utils/supabase/client'
import { Resident } from '@/types'

export type IncidentType = 'fall' | 'infection' | 'pressure_injury' | 'hospitalization' | 'death' | 'other'
export type IncidentStatus = 'open' | 'monitoring' | 'resolved'

export interface Incident {
  id: string
  resident_id: string
  reported_by: string | null
  type: IncidentType
  description: string
  occurred_at: string
  resolved_at: string | null
  status: IncidentStatus
  created_at: string
  resident?: Resident
}

export interface CreateIncidentDTO {
  resident_id: string
  reported_by?: string
  type: IncidentType
  description: string
  occurred_at: string
}

export class IncidentRepository {
  constructor(private supabase: SupabaseClient = defaultClient) {}

  async findAll(): Promise<Incident[]> {
    const { data, error } = await this.supabase
      .from('incidents')
      .select('*, resident:residents(*)')
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Falha ao buscar intercorrências: ${error.message} (${error.code})`)
    return data as Incident[]
  }

  async findOpen(): Promise<Incident[]> {
    const { data, error } = await this.supabase
      .from('incidents')
      .select('*, resident:residents(*)')
      .neq('status', 'resolved')
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Falha ao buscar intercorrências: ${error.message} (${error.code})`)
    return data as Incident[]
  }

  async create(dto: CreateIncidentDTO): Promise<Incident> {
    const { data, error } = await this.supabase
      .from('incidents')
      .insert({ ...dto, status: 'open' })
      .select('*, resident:residents(*)')
      .single()

    if (error) throw new Error(`Falha ao registrar intercorrência: ${error.message} (${error.code})`)
    return data as Incident
  }

  async updateStatus(id: string, status: IncidentStatus): Promise<void> {
    const updates: Record<string, string> = { status }
    if (status === 'resolved') updates.resolved_at = new Date().toISOString()

    const { error } = await this.supabase.from('incidents').update(updates).eq('id', id)
    if (error) throw new Error(`Falha ao atualizar status: ${error.message} (${error.code})`)
  }

  async update(id: string, dto: Partial<CreateIncidentDTO>): Promise<Incident> {
    const { data, error } = await this.supabase
      .from('incidents')
      .update(dto)
      .eq('id', id)
      .select('*, resident:residents(*)')
      .single()

    if (error) throw new Error(`Falha ao atualizar intercorrência: ${error.message} (${error.code})`)
    return data as Incident
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('incidents').delete().eq('id', id)
    if (error) throw new Error(`Falha ao excluir intercorrência: ${error.message} (${error.code})`)
  }
}

export const incidentRepository = new IncidentRepository()
