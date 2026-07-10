import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { AlertsRealtime } from '@/components/mobile/alerts-realtime'
import { PendingApprovals } from '@/components/mobile/pending-approvals'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const PRIVILEGED_ROLES = ['admin', 'supervisor']

export default async function AlertsPage() {
  const cookieStore = cookies()
  const supabase    = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  let userRole = user?.user_metadata?.role as string | undefined
  if (!userRole && user) {
    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    userRole = profile?.role as string | undefined
  }

  const isPrivileged = PRIVILEGED_ROLES.includes(userRole ?? '')

  // Busca todos os alertas ativos com o role_type do POP vinculado
  const { data } = await supabase
    .from('alerts')
    .select('*, resident:residents(name, room_number), pop:pops(role_type)')
    .is('acknowledged_at', null)
    .order('triggered_at', { ascending: false })
    .limit(100)

  const allAlerts = (data ?? []) as any[]

  // Admin e supervisor veem tudo.
  // Demais roles: veem só alertas do seu setor + checkout_missing + incident
  const alerts = isPrivileged
    ? allAlerts
    : allAlerts.filter(a =>
        a.type === 'checkout_missing' ||
        a.type === 'incident' ||
        a.pop?.role_type === userRole
      )

  // Aprovações pendentes (só admin/supervisor)
  let pendingApprovals: any[] = []
  if (isPrivileged) {
    const { data: approvals } = await supabase
      .from('pop_late_approvals')
      .select('*, pop:pops(id, name), user:users(id, name, role)')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .limit(50)
    pendingApprovals = approvals ?? []
  }

  return (
    <div className="flex flex-col h-full bg-cream-50">
      <div className="p-6 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400 mb-1">Central de</p>
        <h1 className="text-2xl font-serif text-dark-800">Alertas Ativos</h1>
        {alerts.length > 0 ? (
          <p className="text-sm text-dark-700/60 mt-1">
            {alerts.length} alerta{alerts.length > 1 ? 's' : ''} aguardando atenção · atualização em tempo real
          </p>
        ) : (
          <p className="text-sm text-dark-700/60 mt-1">Sem alertas para seu setor</p>
        )}
      </div>

      <div className="flex-1 px-6 pb-6 space-y-4 overflow-y-auto">
        {isPrivileged && pendingApprovals.length > 0 && (
          <PendingApprovals initial={pendingApprovals} />
        )}

        <AlertsRealtime
          initial={alerts}
          userRole={userRole ?? null}
          isPrivileged={isPrivileged}
        />

        <div className="pt-4 text-center">
          <Link href="/home" className="text-xs text-gold-400 font-bold uppercase tracking-wider">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
