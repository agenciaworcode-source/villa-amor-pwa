'use client'

import { useNetwork } from '@/hooks/use-network'

export function NetworkStatus() {
  const { online, pendingSync, syncing } = useNetwork()

  if (online && pendingSync === 0) return null

  return (
    <div
      className={`fixed top-16 left-0 right-0 z-50 px-4 py-2 text-center text-xs font-bold transition-all ${
        online ? 'bg-gold-400 text-white' : 'bg-dark-800 text-white'
      }`}
    >
      {!online && '📵 Sem conexão — execuções serão sincronizadas ao reconectar'}
      {online && syncing && '🔄 Sincronizando execuções offline...'}
      {online && !syncing && pendingSync > 0 && `⚠️ ${pendingSync} execuç${pendingSync > 1 ? 'ões' : 'ão'} aguardando sincronização`}
    </div>
  )
}
