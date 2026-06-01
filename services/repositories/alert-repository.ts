import { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/utils/supabase/client'
import { Alert, Resident } from '@/types'

export interface AlertWithDetails extends Alert {
  resident: Resident
}

export class AlertRepository {
  constructor(private supabase: SupabaseClient = defaultClient) {}

  async findAllActive(): Promise<AlertWithDetails[]> {
    const { data, error } = await this.supabase
      .from('alerts')
      .select('*, resident:residents(*)')
      .is('acknowledged_at', null)
      .order('triggered_at', { ascending: false })

    if (error) throw error
    return data as AlertWithDetails[]
  }

  async acknowledge(alertId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('alerts')
      .update({
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId)

    if (error) throw error
  }

  async createIncidentAlert(residentId: string, message: string): Promise<void> {
    const { error } = await this.supabase
      .from('alerts')
      .insert({
        type: 'incident',
        resident_id: residentId,
        severity: 'critical',
        message: message,
        triggered_at: new Date().toISOString()
      })

    if (error) throw error
  }

  async createStepLateAlert(
    executionId: string,
    residentId: string,
    popName: string,
    residentName: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('alerts')
      .insert({
        type: 'step_late',
        execution_id: executionId,
        resident_id: residentId,
        severity: 'high',
        message: `Execução atrasada: ${popName} — ${residentName}`,
        triggered_at: new Date().toISOString()
      })

    if (error) throw error
  }

  async createPOPNotStartedAlert(
    residentId: string,
    popName: string,
    residentName: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('alerts')
      .insert({
        type: 'pop_not_started',
        resident_id: residentId,
        severity: 'high',
        message: `POP não iniciado: ${popName} — ${residentName}`,
        triggered_at: new Date().toISOString()
      })

    if (error) throw error
  }

  async createCheckoutMissingAlert(shiftId: string): Promise<void> {
    const { error } = await this.supabase
      .from('alerts')
      .insert({
        type: 'checkout_missing',
        severity: 'medium',
        message: 'Passagem de plantão não registrada',
        triggered_at: new Date().toISOString()
      })

    if (error) throw error
  }
}

export const alertRepository = new AlertRepository()
