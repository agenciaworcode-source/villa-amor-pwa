'use client'

import { useGeofence, GeofenceStatus } from '@/hooks/use-geofence'

const MESSAGES: Record<GeofenceStatus, { icon: string; title: string; body: string; blocking: boolean }> = {
  checking: {
    icon: '📡',
    title: 'Verificando localização...',
    body: 'Aguarde enquanto confirmamos que você está na Villa Amor.',
    blocking: true,
  },
  inside: {
    icon: '✅',
    title: 'Localização confirmada',
    body: 'Você está dentro da área autorizada.',
    blocking: false,
  },
  outside: {
    icon: '📍',
    title: 'Fora da área autorizada',
    body: 'Você precisa estar a menos de {radius}m da Villa Amor para executar protocolos.',
    blocking: true,
  },
  error: {
    icon: '⚠️',
    title: 'Permissão de localização negada',
    body: 'Ative a localização do dispositivo e recarregue a página para continuar.',
    blocking: true,
  },
  disabled: {
    icon: '',
    title: '',
    body: '',
    blocking: false,
  },
}

interface Props {
  children: React.ReactNode
}

export function GeofenceGate({ children }: Props) {
  const { status, distanceM, radiusM } = useGeofence()
  const cfg = MESSAGES[status]

  if (!cfg.blocking) return <>{children}</>

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cream-50 p-8 text-center space-y-6">
      <div className="w-24 h-24 rounded-full bg-white border-2 border-cream-200 flex items-center justify-center text-4xl shadow-sm">
        {cfg.icon}
      </div>

      <div className="space-y-2 max-w-xs">
        <h2 className="font-serif text-xl font-bold text-dark-800">{cfg.title}</h2>
        <p className="text-sm text-dark-700/60 leading-relaxed">
          {cfg.body.replace('{radius}', String(radiusM))}
        </p>
        {status === 'outside' && distanceM !== null && (
          <p className="text-xs font-mono text-red-500 mt-1">
            Distância atual: {distanceM}m · Máximo: {radiusM}m
          </p>
        )}
      </div>

      {(status === 'outside' || status === 'error') && (
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gold-400 text-white rounded-2xl font-bold text-sm active:scale-95 transition-all"
        >
          Tentar novamente
        </button>
      )}

      {status === 'checking' && (
        <div className="w-8 h-8 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  )
}
