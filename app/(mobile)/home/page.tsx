import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { Shift, ShiftHandover } from '@/types'
import { ShiftControl } from '@/components/mobile/shift-control'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
  multiprofessional: 'Multiprofissional',
}

export default async function HomePage() {
  const cookieStore = cookies()
  const supabase    = createClient(cookieStore)

  const today = new Date().toISOString().split('T')[0]
  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? ''

  const [
    { data: shifts },
    { data: handovers },
    { data: execs },
    { data: alertsData },
  ] = await Promise.all([
    supabase.from('shifts').select('*').eq('date', today).is('ended_at', null).limit(1),
    supabase.from('shift_handovers').select('notes, recorded_at').order('recorded_at', { ascending: false }).limit(1),
    supabase.from('executions').select('status').gte('created_at', today).eq('user_id', userId),
    supabase.from('alerts').select('id').is('acknowledged_at', null).limit(1),
  ])

  const currentShift   = (shifts?.[0] ?? null) as Shift | null
  const latestHandover = (handovers?.[0] ?? null) as Pick<ShiftHandover, 'notes' | 'recorded_at'> | null
  const hasAlerts      = (alertsData?.length ?? 0) > 0

  const userName = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'Colaborador'
  const userRole = (user?.user_metadata?.role as string | undefined) ?? ''

  const totalExecs     = execs?.length ?? 0
  const completedExecs = execs?.filter(e => e.status === 'completed').length ?? 0
  const lateExecs      = execs?.filter(e => e.status === 'late').length ?? 0
  const pct = totalExecs > 0 ? Math.round((completedExecs / totalExecs) * 100) : 0

  return (
    <div className="p-5 space-y-5">

      {/* Saudação */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400 mb-0.5 capitalize">
          {todayFormatted}
        </p>
        <h1 className="text-2xl font-serif text-dark-800">
          Olá, {userName.split(' ')[0]} 👋
        </h1>
        {userRole && (
          <p className="text-sm text-dark-700/50 mt-0.5">{ROLE_LABELS[userRole] ?? userRole}</p>
        )}
      </div>

      {/* Controle de turno — inline */}
      <ShiftControl initialShift={currentShift} />

      {/* Nota do plantão anterior */}
      {latestHandover?.notes && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">📝</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                Nota do plantão anterior
              </p>
              <p className="text-blue-800 text-sm leading-relaxed line-clamp-3 italic">
                &quot;{latestHandover.notes}&quot;
              </p>
              <Link href="/shift/history" className="text-[10px] font-bold text-blue-600 mt-2 block">
                LER COMPLETO →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Resumo do dia */}
      {currentShift && (
        <div className="bg-gold-400 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-gold-100 text-xs font-bold uppercase tracking-wider mb-3">Progresso de hoje</p>
            <div className="flex items-end gap-3 mb-3">
              <span className="text-4xl font-bold tabular-nums leading-none">{pct}%</span>
              <span className="text-gold-200 text-sm mb-1">
                {completedExecs}/{totalExecs} tarefas concluídas
              </span>
            </div>
            <div className="h-2 bg-gold-600/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            {lateExecs > 0 && (
              <p className="text-red-200 text-xs font-bold mt-2">
                ⚠ {lateExecs} tarefa{lateExecs > 1 ? 's' : ''} atrasada{lateExecs > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="absolute -right-3 -bottom-3 text-7xl opacity-10 rotate-12 select-none">☀️</div>
        </div>
      )}

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/pops"
          className="bg-white border border-cream-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all"
        >
          <span className="text-2xl">📋</span>
          <span className="text-[10px] font-bold text-dark-800 uppercase text-center">Minhas Tarefas</span>
        </Link>
        <Link
          href="/alerts"
          className={`rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all ${
            hasAlerts
              ? 'bg-red-50 border border-red-200'
              : 'bg-white border border-cream-200'
          }`}
        >
          <span className="text-2xl">{hasAlerts ? '🔴' : '🛡️'}</span>
          <span className={`text-[10px] font-bold uppercase text-center ${hasAlerts ? 'text-red-600' : 'text-dark-800'}`}>
            {hasAlerts ? 'Alertas Ativos' : 'Sem Alertas'}
          </span>
        </Link>
        <Link
          href="/incidents/new"
          className="bg-white border border-cream-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all"
        >
          <span className="text-2xl">⚠️</span>
          <span className="text-[10px] font-bold text-dark-800 uppercase text-center">Registrar Ocorrência</span>
        </Link>
        <Link
          href="/shift/handover"
          className="bg-white border border-cream-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all"
        >
          <span className="text-2xl">📤</span>
          <span className="text-[10px] font-bold text-dark-800 uppercase text-center">Passar Plantão</span>
        </Link>
      </div>

    </div>
  )
}
