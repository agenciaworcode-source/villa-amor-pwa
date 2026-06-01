import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const SHIFT_LABELS: Record<string, string> = {
  morning: 'Manhã',
  evening: 'Tarde',
  night: 'Noite',
  all: 'Todos',
}

const SHIFT_ICONS: Record<string, string> = {
  morning: '🌅',
  evening: '☀️',
  night: '🌙',
  all: '◎',
}

export default async function ShiftHistoryPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, handovers:shift_handovers(id, notes, recorded_at, user_from_id)')
    .order('date', { ascending: false })
    .limit(30)

  const list = shifts ?? []

  return (
    <div className="flex flex-col h-full bg-cream-50">
      <header className="bg-white p-4 border-b border-cream-200 flex items-center gap-4">
        <Link href="/home" className="text-2xl text-dark-800">←</Link>
        <h1 className="font-bold text-dark-800">Histórico de Turnos</h1>
      </header>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-cream-200 p-10 text-center mt-4">
            <p className="text-3xl mb-3">📋</p>
            <p className="font-bold text-dark-800 mb-1">Nenhum turno registrado</p>
            <p className="text-sm text-dark-700/50">Os turnos encerrados aparecerão aqui.</p>
          </div>
        ) : (
          list.map((shift) => {
            const handover = shift.handovers?.[0] ?? null
            const dateLabel = new Date(shift.date + 'T12:00:00').toLocaleDateString('pt-BR', {
              weekday: 'short', day: '2-digit', month: 'short',
            })
            const startTime = shift.started_at
              ? new Date(shift.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : '—'
            const endTime = shift.ended_at
              ? new Date(shift.ended_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : null

            return (
              <div key={shift.id} className="bg-white rounded-2xl border border-cream-200 overflow-hidden shadow-sm">
                {/* Header do turno */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-cream-100">
                  <span className="text-xl">{SHIFT_ICONS[shift.type] ?? '◎'}</span>
                  <div className="flex-1">
                    <p className="font-bold text-dark-800 text-sm">Turno da {SHIFT_LABELS[shift.type] ?? shift.type}</p>
                    <p className="text-[11px] text-dark-700/50 capitalize">{dateLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-dark-700/60">{startTime}{endTime ? ` → ${endTime}` : ' → em andamento'}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${endTime ? 'bg-green-50 text-green-700' : 'bg-gold-50 text-gold-600'}`}>
                      {endTime ? 'Encerrado' : 'Ativo'}
                    </span>
                  </div>
                </div>

                {/* Passagem de plantão */}
                {handover ? (
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-dark-700/40 mb-1">Passagem de plantão</p>
                    <p className="text-sm text-dark-700/80 leading-relaxed line-clamp-3">{handover.notes}</p>
                    <p className="text-[10px] text-dark-700/30 mt-1 font-mono">
                      {new Date(handover.recorded_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ) : (
                  <div className="px-4 py-3">
                    <p className="text-xs text-dark-700/40 italic">Sem passagem de plantão registrada.</p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
