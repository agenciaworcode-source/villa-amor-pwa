'use client'

import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'
import { usePushNotifications } from '@/hooks/use-push-notifications'

export function PushToggle() {
  const { state, subscribe, unsubscribe } = usePushNotifications()

  if (state === 'unsupported') return null

  const isLoading    = state === 'loading'
  const isSubscribed = state === 'subscribed'
  const isDenied     = state === 'denied'

  const handleToggle = async () => {
    if (isSubscribed) await unsubscribe()
    else await subscribe()
  }

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isSubscribed ? 'bg-gold-100' : 'bg-cream-100'
          }`}>
            {isLoading  ? <Loader2 size={16} className="text-gold-400 animate-spin" />
             : isSubscribed ? <BellRing size={16} className="text-gold-600" />
             : isDenied  ? <BellOff  size={16} className="text-dark-700/40" />
             : <Bell size={16} className="text-dark-700/40" />}
          </div>
          <div>
            <p className="text-sm font-bold text-dark-800 leading-tight">
              Notificações push
            </p>
            <p className="text-[11px] text-dark-700/50 mt-0.5">
              {isSubscribed ? 'Ativas neste dispositivo'
               : isDenied  ? 'Bloqueadas no navegador'
               : 'Alertas e atualizações importantes'}
            </p>
          </div>
        </div>

        {isDenied ? (
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">Bloqueado</span>
        ) : (
          <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              isSubscribed ? 'bg-gold-400' : 'bg-cream-300'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
              isSubscribed ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        )}
      </div>

      {isDenied && (
        <div className="px-5 pb-4 text-[11px] text-dark-700/50 leading-relaxed border-t border-cream-100 pt-3">
          Acesse as configurações do navegador e permita notificações para villa-amor.vercel.app
        </div>
      )}
    </div>
  )
}
