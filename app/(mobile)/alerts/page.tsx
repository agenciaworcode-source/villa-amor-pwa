import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { AlertsRealtime } from '@/components/mobile/alerts-realtime'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AlertsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('alerts')
    .select('*, resident:residents(name, room_number)')
    .is('acknowledged_at', null)
    .order('triggered_at', { ascending: false })
    .limit(50)

  const alerts = (data ?? []) as any[]

  return (
    <div className="flex flex-col h-full bg-cream-50">
      <div className="p-6 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400 mb-1">Central de</p>
        <h1 className="text-2xl font-serif text-dark-800">Alertas Ativos</h1>
        {alerts.length > 0 && (
          <p className="text-sm text-dark-700/60 mt-1">
            {alerts.length} alerta{alerts.length > 1 ? 's' : ''} aguardando atenção · atualização em tempo real
          </p>
        )}
        {alerts.length === 0 && (
          <p className="text-sm text-dark-700/60 mt-1">Monitorando protocolos em tempo real</p>
        )}
      </div>

      <div className="flex-1 px-6 pb-6 space-y-3 overflow-y-auto">
        <AlertsRealtime initial={alerts} />

        <div className="pt-4 text-center">
          <Link href="/home" className="text-xs text-gold-400 font-bold uppercase tracking-wider">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
