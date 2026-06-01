'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { shiftRepository } from '@/services/repositories/shift-repository'
import { useUIStore } from '@/store/ui-store'
import { Shift, ShiftType } from '@/types'

const SHIFTS = [
  { type: 'morning' as ShiftType, label: 'Manhã',  icon: '🌅', hours: '07:00 – 13:00' },
  { type: 'evening' as ShiftType, label: 'Tarde',  icon: '☀️', hours: '13:00 – 19:00' },
  { type: 'night'   as ShiftType, label: 'Noite',  icon: '🌙', hours: '19:00 – 07:00' },
]

const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: 'Manhã', evening: 'Tarde', night: 'Noite', all: 'Todos',
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function ShiftControl({ initialShift }: { initialShift: Shift | null }) {
  const router  = useRouter()
  const { toast } = useUIStore()
  const [shift,  setShift]  = useState<Shift | null>(initialShift)
  const [busy,   setBusy]   = useState(false)
  const [ending, setEnding] = useState(false)  // confirmar encerramento

  const handleStart = async (type: ShiftType) => {
    setBusy(true)
    try {
      const s = await shiftRepository.startShift(type)
      setShift(s)
      toast(`Turno da ${SHIFT_LABELS[type]} iniciado!`, 'success')
      router.refresh()
    } catch {
      toast('Erro ao iniciar turno.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleEnd = async () => {
    if (!shift) return
    setBusy(true)
    try {
      await shiftRepository.endShift(shift.id)
      setShift(null)
      setEnding(false)
      toast('Turno encerrado.', 'success')
      router.push('/shift/handover')
    } catch {
      toast('Erro ao encerrar turno.', 'error')
    } finally {
      setBusy(false)
    }
  }

  /* ── Turno ATIVO ────────────────────────────────────────────────── */
  if (shift) {
    const shiftInfo = SHIFTS.find(s => s.type === shift.type)
    return (
      <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-4 p-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-xl shrink-0">
            {shiftInfo?.icon ?? '🕒'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Turno Ativo</p>
            </div>
            <p className="font-bold text-dark-800">{SHIFT_LABELS[shift.type]}</p>
            {shift.started_at && (
              <p className="text-xs text-dark-700/50">Iniciado às {fmtTime(shift.started_at)}</p>
            )}
          </div>

          {!ending ? (
            <button
              disabled={busy}
              onClick={() => setEnding(true)}
              className="shrink-0 h-9 px-4 rounded-xl bg-cream-100 text-dark-700/70 text-xs font-bold disabled:opacity-50 active:scale-95 transition-all"
            >
              Encerrar
            </button>
          ) : (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setEnding(false)}
                className="h-9 px-3 rounded-xl bg-cream-100 text-dark-700/50 text-xs font-bold"
              >
                Não
              </button>
              <button
                disabled={busy}
                onClick={handleEnd}
                className="h-9 px-3 rounded-xl bg-red-500 text-white text-xs font-bold disabled:opacity-50 active:scale-95 transition-all"
              >
                Confirmar
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── Sem turno: seleção inline ──────────────────────────────────── */
  return (
    <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 pt-4 pb-3 border-b border-cream-100">
        <p className="text-xs font-bold text-dark-700/40 uppercase tracking-wider mb-0.5">Turno</p>
        <p className="font-bold text-dark-800">Nenhum turno ativo</p>
        <p className="text-xs text-dark-700/50">Selecione seu período para começar</p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-cream-100">
        {SHIFTS.map(({ type, label, icon, hours }) => (
          <button
            key={type}
            disabled={busy}
            onClick={() => handleStart(type)}
            className="flex flex-col items-center gap-1 py-4 active:bg-gold-50 transition-all disabled:opacity-40"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-xs font-bold text-dark-800">{label}</span>
            <span className="text-[9px] text-dark-700/40 font-mono">{hours}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
