'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { alertRepository } from '@/services/repositories/alert-repository'
import { residentRepository } from '@/services/repositories/resident-repository'
import { useUIStore } from '@/store/ui-store'
import { Resident } from '@/types'

export default function NewIncidentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useUIStore()

  const [loadingResident, setLoadingResident] = useState(true)
  const [resident, setResident] = useState<Resident | null>(null)
  const [residents, setResidents] = useState<Resident[]>([])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const residentIdParam = searchParams.get('residentId')

  useEffect(() => {
    if (residentIdParam) {
      residentRepository.findById(residentIdParam).then(r => {
        setResident(r)
        setLoadingResident(false)
      })
    } else {
      residentRepository.findAllActive().then(list => {
        setResidents(list)
        setLoadingResident(false)
      })
    }
  }, [residentIdParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resident || !message.trim()) return

    setSending(true)
    try {
      await alertRepository.createIncidentAlert(resident.id, message.trim())
      toast('Alerta enviado com sucesso!', 'success')
      router.back()
    } catch {
      toast('Erro ao enviar alerta. Tente novamente.', 'error')
    } finally {
      setSending(false)
    }
  }

  if (loadingResident) {
    return (
      <div className="flex flex-col h-full bg-cream-50">
        <header className="bg-white p-4 border-b border-cream-200 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-2xl">←</button>
          <h1 className="font-bold text-dark-800">Registrar Alerta</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Nenhum residentId na URL — mostrar seletor de residente
  if (!resident) {
    return (
      <div className="flex flex-col h-full bg-cream-50">
        <header className="bg-white p-4 border-b border-cream-200 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-2xl">←</button>
          <h1 className="font-bold text-dark-800">Registrar Alerta</h1>
        </header>

        <main className="p-6 space-y-4">
          <p className="text-sm font-bold text-dark-700">Selecione o residente:</p>

          {residents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-cream-200 p-10 text-center">
              <p className="text-3xl mb-3">⚠️</p>
              <p className="font-bold text-dark-800 mb-1">Nenhum residente cadastrado</p>
              <p className="text-sm text-dark-700/50">Cadastre residentes no painel administrativo.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {residents.map(r => (
                <button
                  key={r.id}
                  onClick={() => setResident(r)}
                  className="bg-white border border-cream-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all text-left w-full"
                >
                  <div className="w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center font-bold text-gold-600 text-xl shrink-0">
                    {r.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-dark-800">{r.name}</p>
                    <p className="text-xs text-dark-700/50">Quarto {r.room_number}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-cream-50">
      <header className="bg-white p-4 border-b border-cream-200 flex items-center gap-4">
        <button onClick={() => { if (residentIdParam) router.back(); else setResident(null) }} className="text-2xl">←</button>
        <h1 className="font-bold text-dark-800">Registrar Alerta</h1>
      </header>

      <main className="p-6 space-y-6">
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white text-xl shrink-0">
            ⚠️
          </div>
          <div>
            <p className="text-xs text-red-600 font-bold uppercase">Atenção Crítica</p>
            <p className="font-bold text-dark-800">{resident.name}</p>
            <p className="text-xs text-dark-700/50">Quarto {resident.room_number}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-dark-700">O que aconteceu?</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Descreva o incidente ou a necessidade urgente..."
              className="w-full h-40 p-4 rounded-2xl border border-cream-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="w-full h-[58px] bg-red-600 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {sending ? 'ENVIANDO...' : 'DISPARAR ALERTA'}
          </button>
        </form>
      </main>
    </div>
  )
}
