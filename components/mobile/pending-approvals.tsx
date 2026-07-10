'use client'

import { useState } from 'react'

type Approval = {
  id: string
  user_id: string
  pop_id: string
  minutes_late?: number | null
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  pop?: { id: string; name: string } | null
  user?: { id: string; name: string; role: string } | null
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `${diff} min atrás`
  return `${Math.floor(diff / 60)}h atrás`
}

export function PendingApprovals({ initial }: { initial: Approval[] }) {
  const [items, setItems] = useState<Approval[]>(initial)
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    setLoading(p => ({ ...p, [id]: true }))
    try {
      const res = await fetch('/api/pop-approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        setItems(prev => prev.filter(a => a.id !== id))
      }
    } finally {
      setLoading(p => ({ ...p, [id]: false }))
    }
  }

  if (items.length === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-200 flex items-center gap-2">
        <span className="text-lg">⏳</span>
        <div>
          <p className="font-bold text-amber-800 text-sm">Aprovações pendentes</p>
          <p className="text-[10px] text-amber-700/70">{items.length} solicitaç{items.length > 1 ? 'ões' : 'ão'} de início tardio</p>
        </div>
      </div>

      <div className="divide-y divide-amber-100">
        {items.map(a => (
          <div key={a.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-dark-800 text-sm truncate">{a.pop?.name ?? 'POP desconhecido'}</p>
                <p className="text-xs text-dark-700/60 mt-0.5">
                  <span className="font-semibold">{a.user?.name ?? 'Colaborador'}</span>
                  {a.minutes_late != null && a.minutes_late > 0 && (
                    <span className="ml-1 text-amber-600 font-bold">· {a.minutes_late} min atrasado</span>
                  )}
                </p>
                <p className="text-[10px] text-dark-700/40 mt-0.5">{timeAgo(a.requested_at)}</p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  disabled={loading[a.id]}
                  onClick={() => handleReview(a.id, 'rejected')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading[a.id] ? '...' : 'Negar'}
                </button>
                <button
                  disabled={loading[a.id]}
                  onClick={() => handleReview(a.id, 'approved')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-green-500 text-white active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading[a.id] ? '...' : 'Aprovar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
