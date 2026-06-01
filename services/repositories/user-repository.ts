import { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/utils/supabase/client'
import { UserProfile, UserRole } from '@/types'

export class UserRepository {
  constructor(private supabase: SupabaseClient = defaultClient) {}

  async findAll(): Promise<UserProfile[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true })

    if (error) throw new Error(`Falha ao buscar colaboradores: ${error.message} (${error.code})`)
    return data as UserProfile[]
  }

  async findById(id: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data as UserProfile
  }

  async update(id: string, updates: { role?: UserRole; active?: boolean }): Promise<void> {
    const { error } = await this.supabase.from('users').update(updates).eq('id', id)
    if (error) throw new Error(`Falha ao atualizar colaborador: ${error.message} (${error.code})`)
  }

  async deactivate(id: string): Promise<void> {
    const { error } = await this.supabase.from('users').update({ active: false }).eq('id', id)
    if (error) throw new Error(`Falha ao desativar colaborador: ${error.message} (${error.code})`)
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('users').delete().eq('id', id)
    if (error) throw new Error(`Falha ao excluir colaborador: ${error.message} (${error.code})`)
  }
}

export const userRepository = new UserRepository()
