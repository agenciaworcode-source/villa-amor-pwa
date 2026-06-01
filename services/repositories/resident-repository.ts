import { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/utils/supabase/client'
import { Resident, DependencyLevel } from '@/types'

export interface CreateResidentDTO {
  // Identificação
  name: string
  nickname?: string
  birth_date?: string
  nationality?: string
  naturalness?: string
  // Documentos
  cpf?: string
  rg?: string
  rg_issuer?: string
  rg_issue_date?: string
  // Alojamento
  room_number: string
  admission_date?: string
  contract_number?: string
  // Nível de cuidado
  dependency_level: DependencyLevel
  is_bedridden: boolean
  // Responsável legal
  responsible_name?: string
  responsible_relationship?: string
  responsible_cpf?: string
  responsible_phone?: string
  responsible_email?: string
  responsible_address?: string
  // Informações médicas
  doctor_name?: string
  doctor_crm?: string
  health_insurance?: string
  health_insurance_number?: string
  diagnoses?: string
  allergies?: string
  medications?: string
  // Outros
  notes?: string
}

export interface IResidentRepository {
  findAllActive(): Promise<Resident[]>
  findById(id: string): Promise<Resident | null>
  create(dto: CreateResidentDTO): Promise<Resident>
  update(id: string, dto: Partial<CreateResidentDTO>): Promise<Resident>
  deactivate(id: string): Promise<void>
  delete(id: string): Promise<void>
}

function sanitizeResidentDTO<T extends Record<string, any>>(dto: T): T {
  const result = { ...dto }
  for (const key in result) {
    if (result[key] === '') {
      result[key] = null as any
    }
  }
  return result
}

export class SupabaseResidentRepository implements IResidentRepository {
  constructor(private supabase: SupabaseClient = defaultClient) {}

  async findAllActive(): Promise<Resident[]> {
    const { data, error } = await this.supabase
      .from('residents')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true })

    if (error) throw new Error('Falha ao buscar residentes')
    return data as Resident[]
  }

  async findById(id: string): Promise<Resident | null> {
    const { data, error } = await this.supabase
      .from('residents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data as Resident
  }

  async create(dto: CreateResidentDTO): Promise<Resident> {
    const sanitized = sanitizeResidentDTO(dto)
    const { data, error } = await this.supabase
      .from('residents')
      .insert({ ...sanitized, active: true })
      .select()
      .single()

    if (error) throw new Error(`Falha ao cadastrar residente: ${error.message} (${error.code})`)
    return data as Resident
  }

  async update(id: string, dto: Partial<CreateResidentDTO>): Promise<Resident> {
    const sanitized = sanitizeResidentDTO(dto)
    const { data, error } = await this.supabase
      .from('residents')
      .update(sanitized)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Falha ao atualizar residente: ${error.message} (${error.code})`)
    return data as Resident
  }

  async deactivate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('residents')
      .update({ active: false })
      .eq('id', id)

    if (error) throw new Error(`Falha ao desativar residente: ${error.message} (${error.code})`)
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('residents')
      .delete()
      .eq('id', id)

    if (error) throw new Error(`Falha ao excluir residente: ${error.message} (${error.code})`)
  }
}

export const residentRepository = new SupabaseResidentRepository()
