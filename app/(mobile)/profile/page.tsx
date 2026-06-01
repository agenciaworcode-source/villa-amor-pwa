'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { supabase } from '@/utils/supabase/client'

const ROLE_LABELS: Record<string, string> = {
  admin:             'Administrador',
  supervisor:        'Supervisor',
  operational:       'Cuidador',
  enfermeiro:        'Enfermeiro(a)',
  fisioterapeuta:    'Fisioterapeuta',
  psicologo:         'Psicólogo(a)',
  nutricionista:     'Nutricionista',
  cozinheiro:        'Cozinheiro(a)',
  limpeza:           'Limpeza',
  multiprofessional: 'Multiprofissional', // legado
}

export default function ProfilePage() {
  const { user, signOut } = useAuthStore()
  const router = useRouter()

  const name: string = user?.user_metadata?.name ?? user?.email ?? 'Colaborador'
  const role: string = user?.user_metadata?.role ?? ''
  const email: string = user?.email ?? ''

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    signOut()
    router.push('/login')
  }

  return (
    <div className="flex flex-col h-full bg-cream-50">
      <div className="p-6 pb-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400 mb-1">Minha conta</p>
        <h1 className="text-2xl font-serif text-dark-800">Perfil</h1>
      </div>

      <div className="p-6 space-y-4">
        {/* Avatar card */}
        <div className="bg-white rounded-3xl border border-cream-200 p-6 flex items-center gap-5 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gold-100 flex items-center justify-center text-2xl font-bold text-gold-600 shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-dark-800 text-base leading-tight">{name}</p>
            <p className="text-xs text-dark-700/60 mt-0.5">{email}</p>
            {role && (
              <span className="inline-block mt-2 px-2.5 py-0.5 bg-gold-50 text-gold-600 text-[10px] font-bold uppercase tracking-wide rounded-full border border-gold-200">
                {ROLE_LABELS[role] ?? role}
              </span>
            )}
          </div>
        </div>

        {/* Info rows */}
        <div className="bg-white rounded-2xl border border-cream-200 divide-y divide-cream-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-dark-700/60">E-mail</span>
            <span className="text-sm font-bold text-dark-800">{email}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-dark-700/60">Função</span>
            <span className="text-sm font-bold text-dark-800">{ROLE_LABELS[role] ?? '—'}</span>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full h-[54px] bg-red-50 border border-red-100 text-red-600 rounded-2xl font-bold text-sm active:scale-[0.98] transition-all mt-4"
        >
          Sair da conta
        </button>
      </div>
    </div>
  )
}
