'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function requeueExecution(executionId: string): Promise<{ error?: string }> {
  const supabase = createClient(cookies())

  // Verifica que o usuário é admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Apenas administradores podem reenviar execuções.' }

  // Reseta todos os steps para pending
  const { error: stepsError } = await supabase
    .from('execution_steps')
    .update({ status: 'pending', completed_at: null })
    .eq('execution_id', executionId)

  if (stepsError) return { error: 'Erro ao resetar etapas.' }

  // Reseta a execução para in_progress (mantém started_at para rastreio)
  const { error: execError } = await supabase
    .from('executions')
    .update({ status: 'in_progress', completed_at: null })
    .eq('id', executionId)

  if (execError) return { error: 'Erro ao resetar execução.' }

  revalidatePath('/dashboard/executions')
  return {}
}
