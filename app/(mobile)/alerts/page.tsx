import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const SEVERITY_CONFIG = {
  critical: { label: 'Crítico',  bg: '#FEF2F2', border: '#EF4444', text: '#B91C1C', dot: '#EF4444' },
  high:     { label: 'Alto',     bg: '#FFF7ED', border: '#F97316', text: '#C2410C', dot: '#F97316' },
  medium:   { label: 'Médio',    bg: '#FEFCE8', border: '#EAB308', text: '#854D0E', dot: '#EAB308' },
  low:      { label: 'Baixo',    bg: '#F0FDF4', border: '#22C55E', text: '#15803D', dot: '#22C55E' },
} as const

type Severity = keyof typeof SEVERITY_CONFIG

export default async function AlertsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('alerts')
    .select('*, resident:residents(name, room_number)')
    .is('acknowledged_at', null)
    .order('triggered_at', { ascending: false })
    .limit(50)

  const alerts = data ?? []

  return (
    <div className="flex flex-col h-full bg-cream-50">
      <div className="p-6 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400 mb-1">Central de</p>
        <h1 className="text-2xl font-serif text-dark-800">Alertas Ativos</h1>
        {alerts.length > 0 && (
          <p className="text-sm text-dark-700/60 mt-1">{alerts.length} alerta{alerts.length > 1 ? 's' : ''} aguardando atenção</p>
        )}
      </div>

      <div className="flex-1 px-6 pb-6 space-y-3 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-cream-200 p-10 text-center mt-4">
            <p className="text-3xl mb-3">🛡️</p>
            <p className="font-bold text-dark-800 mb-1">Nenhum alerta ativo</p>
            <p className="text-sm text-dark-700/50">Todos os alertas foram resolvidos.</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const cfg = SEVERITY_CONFIG[(alert.severity as Severity) ?? 'low']
            const resident = alert.resident as unknown as { name: string; room_number: string } | null
            const time = new Date(alert.triggered_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            return (
              <div
                key={alert.id}
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 16, padding: '14px 16px' }}
              >
                <div className="flex items-start gap-3">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0, marginTop: 6 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: cfg.text }}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-dark-700/40 font-mono">{time}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1C', marginBottom: 4 }}>{alert.message}</p>
                    {resident && (
                      <p className="text-xs text-dark-700/60">
                        {resident.name} · Quarto {resident.room_number}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}

        <div className="pt-4 text-center">
          <Link href="/home" className="text-xs text-gold-400 font-bold uppercase tracking-wider">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
