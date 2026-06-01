'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { shiftRepository } from '@/services/repositories/shift-repository'
import { useUIStore } from '@/store/ui-store'
import { Shift, ShiftType } from '@/types'

const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: 'Manhã',
  evening: 'Tarde',
  night:   'Noite',
  all:     'Todos',
}

export default function ShiftManagePage() {
  const router = useRouter()
  const { toast } = useUIStore()
  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    shiftRepository.getCurrentShift().then(shift => {
      setCurrentShift(shift)
      setLoading(false)
    })
  }, [])

  const handleStartShift = async (type: ShiftType) => {
    setStarting(true)
    try {
      await shiftRepository.startShift(type)
      toast(`Turno da ${SHIFT_LABELS[type]} iniciado com sucesso!`, 'success')
      router.push('/home')
    } catch {
      toast('Erro ao iniciar turno. Tente novamente.', 'error')
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-center font-serif text-dark-800">
        Acessando central de turnos...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-cream-50">
      <header className="bg-white p-4 border-b border-cream-200 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-2xl">←</button>
        <h1 className="font-bold text-dark-800">Gestão de Turno</h1>
      </header>

      <main className="p-6 space-y-8">
        {currentShift ? (
          <div className="bg-white p-8 rounded-3xl border border-cream-200 shadow-sm text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto">
              🕒
            </div>
            <div>
              <h2 className="text-2xl font-bold text-dark-800 uppercase tracking-tighter">Turno Ativo</h2>
              <p className="text-dark-700/60 font-serif">{SHIFT_LABELS[currentShift.type]}</p>
            </div>
            <p className="text-xs text-dark-700/40">
              Iniciado em: {new Date(currentShift.started_at!).toLocaleString('pt-BR')}
            </p>
            <button
              onClick={() => router.push('/shift/handover')}
              className="w-full h-[58px] bg-dark-800 text-white rounded-2xl font-bold mt-4"
            >
              FINALIZAR E PASSAR PLANTÃO
            </button>
            <button
              onClick={() => router.push('/shift/history')}
              className="w-full h-[46px] bg-cream-100 text-dark-700/60 rounded-2xl font-bold text-sm"
            >
              Ver histórico de turnos
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-serif text-dark-800">Iniciar Novo Turno</h2>
              <p className="text-dark-700/60 text-sm">Selecione o seu período de trabalho</p>
            </div>

            <div className="grid gap-4">
              {([
                { type: 'morning' as ShiftType, icon: '🌅', hours: '07:00 às 13:00' },
                { type: 'evening' as ShiftType, icon: '☀️', hours: '13:00 às 19:00' },
                { type: 'night'   as ShiftType, icon: '🌙', hours: '19:00 às 07:00' },
              ] as const).map(({ type, icon, hours }) => (
                <button
                  key={type}
                  onClick={() => handleStartShift(type)}
                  disabled={starting}
                  className="bg-white border border-cream-200 p-6 rounded-3xl flex items-center gap-4 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                >
                  <span className="text-3xl">{icon}</span>
                  <div className="text-left">
                    <p className="font-bold text-dark-800">{SHIFT_LABELS[type]}</p>
                    <p className="text-xs text-dark-700/50">{hours}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
