'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const SEVERITY_CONFIG = {
  critical: { label: 'Crítico',  bg: '#FEF2F2', border: '#EF4444', text: '#B91C1C', dot: '#EF4444' },
  high:     { label: 'Alto',     bg: '#FFF7ED', border: '#F97316', text: '#C2410C', dot: '#F97316' },
  medium:   { label: 'Médio',    bg: '#FEFCE8', border: '#EAB308', text: '#854D0E', dot: '#EAB308' },
  low:      { label: 'Baixo',    bg: '#F0FDF4', border: '#22C55E', text: '#15803D', dot: '#22C55E' },
} as const

type Severity = keyof typeof SEVERITY_CONFIG

type AlertRow = {
  id: string
  type: string
  severity: Severity
  message: string
  triggered_at: string
  resident_id: string | null
  resident?: { name: string; room_number: string } | null
  isNew?: boolean
}

export function AlertsRealtime({ initial }: { initial: AlertRow[] }) {
  const [alerts, setAlerts] = useState<AlertRow[]>(initial)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('alerts-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        async (payload) => {
          const newAlert = payload.new as AlertRow

          // Fetch resident name for the new alert
          if (newAlert.resident_id) {
            const { data } = await supabase
              .from('residents')
              .select('name, room_number')
              .eq('id', newAlert.resident_id)
              .single()
            newAlert.resident = data ?? null
          }

          newAlert.isNew = true
          setAlerts(prev => [newAlert, ...prev])

          // Remove the "new" highlight after 4 seconds
          setTimeout(() => {
            setAlerts(prev =>
              prev.map(a => a.id === newAlert.id ? { ...a, isNew: false } : a)
            )
          }, 4000)

          // Optional: vibrate if available (mobile)
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const updated = payload.new as AlertRow
          // If acknowledged, remove from list
          if ((updated as any).acknowledged_at) {
            setAlerts(prev => prev.filter(a => a.id !== updated.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-cream-200 p-10 text-center mt-4">
        <p className="text-3xl mb-3">🛡️</p>
        <p className="font-bold text-dark-800 mb-1">Nenhum alerta ativo</p>
        <p className="text-sm text-dark-700/50">Todos os protocolos estão em dia.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const cfg = SEVERITY_CONFIG[alert.severity ?? 'low']
        const resident = alert.resident as { name: string; room_number: string } | null | undefined
        const time = new Date(alert.triggered_at).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })

        return (
          <div
            key={alert.id}
            style={{
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: 16,
              padding: '14px 16px',
              transition: 'box-shadow 0.4s ease, transform 0.4s ease',
              boxShadow: alert.isNew ? `0 0 0 3px ${cfg.border}` : undefined,
              transform: alert.isNew ? 'scale(1.01)' : undefined,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: cfg.dot,
                  flexShrink: 0,
                  marginTop: 6,
                  boxShadow: alert.isNew ? `0 0 6px ${cfg.dot}` : undefined,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        color: cfg.text,
                      }}
                    >
                      {cfg.label}
                    </span>
                    {alert.isNew && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          background: cfg.dot,
                          color: '#fff',
                          borderRadius: 4,
                          padding: '1px 5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        NOVO
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-dark-700/40 font-mono">{time}</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1C', marginBottom: 4 }}>
                  {alert.message}
                </p>
                {resident && (
                  <p className="text-xs text-dark-700/60">
                    {resident.name} · Quarto {resident.room_number}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
