import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { Shift, ShiftHandover } from '@/types'
import { SectionHeader, Card, Btn } from '@/components/dashboard/ui'

export const dynamic = 'force-dynamic'

export default async function HandoverPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const today = new Date().toISOString().split('T')[0]

  const [{ data: shifts }, { data: handovers }] = await Promise.all([
    supabase.from('shifts').select('*').eq('date', today).is('ended_at', null).limit(1),
    supabase.from('shift_handovers').select('*').order('recorded_at', { ascending: false }).limit(1),
  ])

  const currentShift = (shifts?.[0] ?? null) as Shift | null
  const latestHandover = (handovers?.[0] ?? null) as ShiftHandover | null

  const shiftLabel = currentShift
    ? ({ morning: 'Diurno', evening: 'Vespertino', night: 'Noturno', all: 'Integral' } as Record<string, string>)[currentShift.type] ?? currentShift.type
    : null

  return (
    <div>
      <SectionHeader
        eyebrow="Operacional"
        title="Passagem de Plantão"
        sub="Registro digital de transferência entre turnos"
      />

      <div style={{ maxWidth: 560 }}>
        <Card style={{ padding: 32, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⇄</div>
          <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 700, color: '#1C1C1C', marginBottom: 8 }}>
            {shiftLabel ? `Turno ${shiftLabel} em andamento` : 'Nenhum turno ativo'}
          </h3>
          <p style={{ fontSize: 13, color: '#9C8E80', marginBottom: 24 }}>
            {currentShift
              ? `Iniciado em ${new Date(currentShift.started_at ?? '').toLocaleString('pt-BR')}`
              : 'Inicie um turno no app mobile para ver informações aqui.'}
          </p>

          {latestHandover && (
            <div style={{ background: '#F7F0E3', borderRadius: 10, padding: '14px 18px', marginBottom: 20, textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9C8E80', marginBottom: 10 }}>
                Última passagem registrada
              </div>
              {[
                { label: 'Horário',      value: new Date(latestHandover.recorded_at).toLocaleString('pt-BR') },
                { label: 'Observações',  value: latestHandover.notes },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9C8E80', width: 90, flexShrink: 0 }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: '#1C1C1C' }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          <Btn variant="primary" size="lg">Ver histórico de passagens</Btn>
        </Card>
      </div>
    </div>
  )
}
