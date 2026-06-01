import { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/utils/supabase/client'
import { POP, POPBlock, POPStep, UserRole, ShiftType, StepType, ResidentPOPAssignment, POPStaffRotation, Resident, UserProfile } from '@/types'

export interface CreatePOPDTO {
  name: string
  role_type: UserRole
  shift_type: ShiftType
  tolerance_minutes: number
  start_time_expected?: string
  deadline_time?: string
}

export interface CreateBlockDTO {
  pop_id: string
  name: string
  order_index: number
  tolerance_minutes?: number
}

export interface CreateStepDTO {
  block_id: string
  order_index: number
  title: string
  description?: string
  type: StepType
  is_mandatory: boolean
}

export interface IPOPRepository {
  findAllActive(): Promise<POP[]>
  findAll(): Promise<POP[]>
  findByIdWithDetails(id: string): Promise<(POP & { blocks: (POPBlock & { steps: POPStep[] })[] }) | null>
  create(dto: CreatePOPDTO): Promise<POP>
  update(id: string, dto: Partial<CreatePOPDTO>): Promise<POP>
  toggleActive(id: string, active: boolean): Promise<void>
  createBlock(dto: CreateBlockDTO): Promise<POPBlock>
  updateBlock(id: string, dto: Partial<CreateBlockDTO>): Promise<void>
  deleteBlock(id: string): Promise<void>
  createStep(dto: CreateStepDTO): Promise<POPStep>
  updateStep(id: string, dto: Partial<CreateStepDTO>): Promise<void>
  deleteStep(id: string): Promise<void>
  delete(id: string): Promise<void>
}

export class SupabasePOPRepository implements IPOPRepository {
  constructor(private supabase: SupabaseClient = defaultClient) {}

  async findAllActive(): Promise<POP[]> {
    const { data, error } = await this.supabase
      .from('pops')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true })

    if (error) throw new Error(`Falha ao buscar protocolos: ${error.message} (${error.code})`)
    return data as POP[]
  }

  async findAll(): Promise<POP[]> {
    const { data, error } = await this.supabase
      .from('pops')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw new Error(`Falha ao buscar protocolos: ${error.message} (${error.code})`)
    return data as POP[]
  }

  async findByIdWithDetails(id: string): Promise<(POP & { blocks: (POPBlock & { steps: POPStep[] })[] }) | null> {
    const { data: pop, error: popError } = await this.supabase
      .from('pops').select('*').eq('id', id).single()

    if (popError || !pop) return null

    const { data: blocks, error: blocksError } = await this.supabase
      .from('pop_blocks')
      .select('*, steps:pop_steps(*)')
      .eq('pop_id', id)
      .order('order_index', { ascending: true })

    if (blocksError) throw new Error(`Falha ao buscar blocos do protocolo: ${blocksError.message} (${blocksError.code})`)

    return { ...pop, blocks: blocks as (POPBlock & { steps: POPStep[] })[] }
  }

  async create(dto: CreatePOPDTO): Promise<POP> {
    const { data, error } = await this.supabase
      .from('pops')
      .insert({ ...dto, active: true, version: 1 })
      .select()
      .single()

    if (error) throw new Error(`Falha ao criar protocolo: ${error.message} (${error.code})`)
    return data as POP
  }

  async update(id: string, dto: Partial<CreatePOPDTO>): Promise<POP> {
    const { data, error } = await this.supabase
      .from('pops')
      .update(dto)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Falha ao atualizar protocolo: ${error.message} (${error.code})`)
    return data as POP
  }

  async toggleActive(id: string, active: boolean): Promise<void> {
    const { error } = await this.supabase.from('pops').update({ active }).eq('id', id)
    if (error) throw new Error(`Falha ao alterar status do protocolo: ${error.message} (${error.code})`)
  }

  async createBlock(dto: CreateBlockDTO): Promise<POPBlock> {
    const { data, error } = await this.supabase
      .from('pop_blocks')
      .insert(dto)
      .select()
      .single()

    if (error) throw new Error(`Falha ao criar bloco: ${error.message} (${error.code})`)
    return data as POPBlock
  }

  async updateBlock(id: string, dto: Partial<CreateBlockDTO>): Promise<void> {
    const { error } = await this.supabase.from('pop_blocks').update(dto).eq('id', id)
    if (error) throw new Error(`Falha ao atualizar bloco: ${error.message} (${error.code})`)
  }

  async deleteBlock(id: string): Promise<void> {
    const { error } = await this.supabase.from('pop_blocks').delete().eq('id', id)
    if (error) throw new Error(`Falha ao deletar bloco: ${error.message} (${error.code})`)
  }

  async createStep(dto: CreateStepDTO): Promise<POPStep> {
    const { data, error } = await this.supabase
      .from('pop_steps')
      .insert(dto)
      .select()
      .single()

    if (error) throw new Error(`Falha ao criar passo: ${error.message} (${error.code})`)
    return data as POPStep
  }

  async updateStep(id: string, dto: Partial<CreateStepDTO>): Promise<void> {
    const { error } = await this.supabase.from('pop_steps').update(dto).eq('id', id)
    if (error) throw new Error(`Falha ao atualizar passo: ${error.message} (${error.code})`)
  }

  async deleteStep(id: string): Promise<void> {
    const { error } = await this.supabase.from('pop_steps').delete().eq('id', id)
    if (error) throw new Error(`Falha ao deletar passo: ${error.message} (${error.code})`)
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('pops').delete().eq('id', id)
    if (error) throw new Error(`Falha ao excluir protocolo: ${error.message} (${error.code})`)
  }

  // ── Atribuição de residentes ────────────────────────────────────────────────

  async getAssignedResidents(popId: string): Promise<Resident[]> {
    const { data, error } = await this.supabase
      .from('resident_pop_assignments')
      .select('resident:residents(*)')
      .eq('pop_id', popId)
      .eq('active', true)

    if (error) throw new Error(`Falha ao buscar residentes atribuídos: ${error.message}`)
    return (data ?? []).map((row: any) => row.resident as Resident).filter(Boolean)
  }

  async getAssignedPOPs(residentId: string): Promise<POP[]> {
    const { data, error } = await this.supabase
      .from('resident_pop_assignments')
      .select('pop:pops(*)')
      .eq('resident_id', residentId)
      .eq('active', true)

    if (error) throw new Error(`Falha ao buscar POPs do residente: ${error.message}`)
    return (data ?? []).map((row: any) => row.pop as POP).filter(r => r?.active)
  }

  async assignResident(popId: string, residentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('resident_pop_assignments')
      .upsert({ pop_id: popId, resident_id: residentId, active: true }, { onConflict: 'resident_id,pop_id' })

    if (error) throw new Error(`Falha ao atribuir residente: ${error.message}`)
  }

  async unassignResident(popId: string, residentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('resident_pop_assignments')
      .update({ active: false })
      .eq('pop_id', popId)
      .eq('resident_id', residentId)

    if (error) throw new Error(`Falha ao desatribuir residente: ${error.message}`)
  }

  // ── Rodízio de colaboradores ────────────────────────────────────────────────

  async getRotation(popId: string): Promise<POPStaffRotation[]> {
    const { data, error } = await this.supabase
      .from('pop_staff_rotation')
      .select('*, user:users(id, name, email, role, active)')
      .eq('pop_id', popId)
      .eq('active', true)
      .order('order_index', { ascending: true })

    if (error) throw new Error(`Falha ao buscar rodízio: ${error.message}`)
    return (data ?? []) as POPStaffRotation[]
  }

  async setRotation(popId: string, userIds: string[]): Promise<void> {
    // Desativa todos os atuais
    await this.supabase.from('pop_staff_rotation').update({ active: false }).eq('pop_id', popId)

    if (userIds.length === 0) return

    // Upsert na nova ordem
    const rows = userIds.map((user_id, i) => ({
      pop_id: popId,
      user_id,
      order_index: i,
      active: true,
    }))

    const { error } = await this.supabase
      .from('pop_staff_rotation')
      .upsert(rows, { onConflict: 'pop_id,user_id' })

    if (error) throw new Error(`Falha ao salvar rodízio: ${error.message}`)
  }

  /** Chama ao concluir uma execução: avança a fila marcando a data do colaborador */
  async advanceRotation(popId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('pop_staff_rotation')
      .update({ last_assigned_date: new Date().toISOString().split('T')[0] })
      .eq('pop_id', popId)
      .eq('user_id', userId)

    if (error) throw new Error(`Falha ao avançar rodízio: ${error.message}`)
  }

  /** Retorna o userId que está "na vez" (quem foi designado há mais tempo) */
  async getNextInRotation(popId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('pop_staff_rotation')
      .select('user_id, last_assigned_date')
      .eq('pop_id', popId)
      .eq('active', true)
      .order('last_assigned_date', { ascending: true, nullsFirst: true })
      .limit(1)
      .single()

    if (error) return null
    return data?.user_id ?? null
  }
}

export const popRepository = new SupabasePOPRepository()
