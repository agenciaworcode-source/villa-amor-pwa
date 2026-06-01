'use client'

import { Download } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/use-install-prompt'

export function InstallBanner() {
  const { canInstall, install } = useInstallPrompt()

  if (!canInstall) return null

  return (
    <div className="mx-4 mt-4 bg-gold-50 border border-gold-200 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
      <div className="w-9 h-9 bg-gold-400 rounded-xl flex items-center justify-center shrink-0">
        <Download size={16} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-dark-800 leading-tight">Instalar Villa Amor</p>
        <p className="text-[11px] text-dark-700/60 mt-0.5">Acesso rápido direto da tela inicial</p>
      </div>
      <button
        onClick={install}
        className="shrink-0 h-8 px-3 bg-gold-400 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
      >
        Instalar
      </button>
    </div>
  )
}
