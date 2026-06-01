import { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/utils/supabase/client'
import { Execution, ExecutionStep, MediaFile } from '@/types'

export interface IExecutionRepository {
  create(execution: Partial<Execution>): Promise<Execution>
  findById(id: string): Promise<Execution | null>
  findTodayExecution(popId: string, residentId: string, userId: string): Promise<Execution | null>
  findTodayExecutionsByUser(userId: string): Promise<Pick<Execution, 'id' | 'pop_id' | 'resident_id' | 'status'>[]>
  updateStatus(id: string, status: string): Promise<void>
  addStep(step: Partial<ExecutionStep>): Promise<ExecutionStep>
  updateStep(id: string, updates: Partial<ExecutionStep>): Promise<void>
  addMedia(media: Partial<MediaFile>): Promise<MediaFile>
}

export class SupabaseExecutionRepository implements IExecutionRepository {
  constructor(private supabase: SupabaseClient = defaultClient) {}

  async create(execution: Partial<Execution>): Promise<Execution> {
    const { data, error } = await this.supabase
      .from('executions')
      .insert(execution)
      .select()
      .single()

    if (error) {
      console.error('Error creating execution:', error)
      throw new Error('Falha ao iniciar execução')
    }

    return data as Execution
  }

  async findById(id: string): Promise<Execution | null> {
    const { data, error } = await this.supabase
      .from('executions')
      .select('*, steps:execution_steps(*, media:media_files(*))')
      .eq('id', id)
      .single()

    if (error) return null
    return data as Execution
  }

  async findTodayExecution(popId: string, residentId: string | null, userId: string): Promise<Execution | null> {
    // midnight UTC today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    let query = this.supabase
      .from('executions')
      .select('*, steps:execution_steps(*, media:media_files(*))')
      .eq('pop_id', popId)
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (residentId) {
      query = query.eq('resident_id', residentId)
    } else {
      query = query.is('resident_id', null)
    }

    const { data, error } = await query.maybeSingle()
    if (error) return null
    return data as Execution | null
  }

  async findTodayExecutionsByUser(userId: string): Promise<Pick<Execution, 'id' | 'pop_id' | 'resident_id' | 'status'>[]> {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data, error } = await this.supabase
      .from('executions')
      .select('id, pop_id, resident_id, status')
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString())

    if (error) return []
    return (data ?? []) as Pick<Execution, 'id' | 'pop_id' | 'resident_id' | 'status'>[]
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from('executions')
      .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
      .eq('id', id)

    if (error) throw new Error('Falha ao atualizar status da execução')
  }

  async addStep(step: Partial<ExecutionStep>): Promise<ExecutionStep> {
    const { data, error } = await this.supabase
      .from('execution_steps')
      .insert(step)
      .select()
      .single()

    if (error) throw new Error('Falha ao registrar passo')
    return data as ExecutionStep
  }

  async updateStep(id: string, updates: Partial<ExecutionStep>): Promise<void> {
    const { error } = await this.supabase
      .from('execution_steps')
      .update(updates)
      .eq('id', id)

    if (error) throw new Error('Falha ao atualizar passo')
  }

  async addMedia(media: Partial<MediaFile>): Promise<MediaFile> {
    const { data, error } = await this.supabase
      .from('media_files')
      .insert(media)
      .select()
      .single()

    if (error) throw new Error('Falha ao salvar mídia')
    return data as MediaFile
  }
}

export const executionRepository = new SupabaseExecutionRepository()
