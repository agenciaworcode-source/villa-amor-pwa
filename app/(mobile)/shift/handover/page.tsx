'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { shiftRepository } from '@/services/repositories/shift-repository'
import { useAuthStore } from '@/store/auth-store'
import { useUIStore } from '@/store/ui-store'
import { Shift } from '@/types'

export default function ShiftHandoverPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { toast } = useUIStore()
  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    shiftRepository.getCurrentShift().then(shift => {
      setCurrentShift(shift)
      setLoading(false)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notes.trim()) return

    setSending(true)
    try {
      await shiftRepository.createHandover({
        shift_from_id: currentShift?.id,
        user_from_id: user?.id,
        notes: notes.trim(),
      })

      if (currentShift) {
        await shiftRepository.endShift(currentShift.id)
      }

      toast('Passagem de plantão registrada com sucesso!', 'success')
      router.push('/home')
    } catch {
      toast('Erro ao registrar passagem de plantão. Tente novamente.', 'error')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-center font-serif text-dark-800">
        Carregando...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-cream-50">
      <header className="bg-white p-4 border-b border-cream-200 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-2xl">←</button>
        <h1 className="font-bold text-dark-800">Passagem de Plantão</h1>
      </header>

      <main className="p-6 space-y-6">
        <div className="bg-gold-50 border border-gold-100 p-4 rounded-2xl">
          <p className="text-xs text-gold-600 font-bold uppercase mb-1">Turno de Saída</p>
          <p className="font-bold text-dark-800">
            {currentShift
              ? { morning: 'Manhã', evening: 'Tarde', night: 'Noite', all: 'Todos' }[currentShift.type]
              : 'Nenhum turno ativo'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-dark-700">Resumo do Plantão</label>
            <p className="text-xs text-dark-700/50 mb-2">
              Relate ocorrências importantes, mudanças de medicação ou estados emocionais dos residentes.
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Sr. Tião estava mais agitado hoje. Dona Maria não quis almoçar..."
              className="w-full h-60 p-4 rounded-2xl border border-cream-200 focus:ring-2 focus:ring-gold-400 outline-none resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={sending || !notes.trim()}
            className="w-full h-[58px] bg-gold-400 text-white rounded-2xl font-bold text-lg shadow-gold active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {sending ? 'REGISTRANDO...' : 'CONFIRMAR PASSAGEM'}
          </button>
        </form>
      </main>
    </div>
  )
}
