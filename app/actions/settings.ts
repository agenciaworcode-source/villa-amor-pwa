'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export type SystemSettings = Record<string, string>

export async function getSettings(): Promise<SystemSettings> {
  // Service role bypassa RLS — garante leitura mesmo sem policy configurada
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await admin.from('system_settings').select('key, value')
  const map: SystemSettings = {}
  for (const row of data ?? []) map[row.key] = row.value
  return map
}

export async function updateSettings(entries: SystemSettings): Promise<{ error?: string }> {
  // Verifica se é admin via cliente normal (session do usuário)
  const supabase = createClient(cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Apenas administradores podem alterar configurações.' }

  // Escreve com service role para evitar problemas de RLS no upsert
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const rows = Object.entries(entries).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await admin
    .from('system_settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) {
    console.error('[updateSettings] error:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings')
  return {}
}
