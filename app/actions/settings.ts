'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type SystemSettings = Record<string, string>

export async function getSettings(): Promise<SystemSettings> {
  const supabase = createClient(cookies())
  const { data } = await supabase.from('system_settings').select('key, value')
  const map: SystemSettings = {}
  for (const row of data ?? []) map[row.key] = row.value
  return map
}

export async function updateSettings(entries: SystemSettings): Promise<{ error?: string }> {
  const supabase = createClient(cookies())

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Apenas administradores podem alterar configurações.' }

  const rows = Object.entries(entries).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('system_settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return {}
}
