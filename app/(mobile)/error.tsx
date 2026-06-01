'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MobileError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const router = useRouter()

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-10 text-center space-y-6">
      <div className="text-5xl">⚠️</div>
      <div className="space-y-2">
        <h2 className="font-serif text-xl text-dark-800">Algo deu errado</h2>
        <p className="text-sm text-dark-700/60">Tente novamente ou volte para o início.</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-gold-400 text-white rounded-xl font-bold text-sm active:scale-95 transition-all"
        >
          Tentar novamente
        </button>
        <button
          onClick={() => router.push('/home')}
          className="px-5 py-2.5 bg-cream-200 text-dark-800 rounded-xl font-bold text-sm active:scale-95 transition-all"
        >
          Início
        </button>
      </div>
    </div>
  )
}
