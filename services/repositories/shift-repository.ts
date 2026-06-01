import { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/utils/supabase/client'
import { Shift, ShiftHandover, ShiftType } from '@/types'

export class ShiftRepository {
  constructor(private supabase: SupabaseClient = defaultClient) {}

  async getCurrentShift(): Promise<Shift | null> {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await this.supabase
      .from('shifts')
      .select('*')
      .eq('date', today)
      .is('ended_at', null)
      .single()

    if (error) return null
    return data as Shift
  }

  async startShift(type: ShiftType): Promise<Shift> {
    const { data, error } = await this.supabase
      .from('shifts')
      .insert({
        date: new Date().toISOString().split('T')[0],
        type,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data as Shift
  }

  async endShift(shiftId: string): Promise<void> {
    const { error } = await this.supabase
      .from('shifts')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', shiftId)

    if (error) throw error
  }

  async createHandover(handover: Partial<ShiftHandover>): Promise<ShiftHandover> {
    const { data, error } = await this.supabase
      .from('shift_handovers')
      .insert({
        ...handover,
        recorded_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data as ShiftHandover
  }

  async getLatestHandover(): Promise<ShiftHandover | null> {
    const { data, error } = await this.supabase
      .from('shift_handovers')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (error) return null
    return data as ShiftHandover
  }
}

export const shiftRepository = new ShiftRepository()
