import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { Resident, Shift, ShiftHandover } from '@/types'
import Link from 'next/link'
import Image from 'next/image'

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
  multiprofessional: 'Multiprofissional', // legado
}

const SHIFT_LABELS: Record<string, string> = {
  morning: 'Diurno',
  evening: 'Vespertino',
  night:   'Noturno',
  all:     'Todos os Turnos',
}

const EXEC_STATUS_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  completed:   { label: 'Concluído',    bg: '#F0FDF4', color: '#15803D', border: '#86EFAC' },
  in_progress: { label: 'Em andamento', bg: '#FFF8EE', color: '#B8864E', border: '#B8864E' },
  late:        { label: 'Atrasado',     bg: '#FEF2F2', color: '#B91C1C', border: '#FCA5A5' },
  pending:     { label: 'Pendente',     bg: '#F7F0E3', color: '#9C8E80', border: '#D9C9A8' },
}

interface AgendaResidentRow {
  residentId: string
  residentName: string
  roomNumber: string
  photoUrl: string | null
  executionStatus: string | null
}

interface AgendaPopBlock {
  popId: string
  popName: string
  startTime: string | null
  deadlineTime: string | null
  residents: AgendaResidentRow[]
  completedCount: number
  totalCount: number
}

export default async function HomePage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const today = new Date().toISOString().split('T')[0]
  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  // ── 1. Round 1 — tudo em paralelo ────────────────────────────────
  // Role: cookie (1h TTL do middleware) → user_metadata → DB (raro)
  const roleFromCookie = cookieStore.get('x-role')?.value

  const [
    { data: { user } },
    [{ data: shifts }, { data: handovers }],
    { data: allRotationData },
  ] = await Promise.all([
    supabase.auth.getUser(),
    Promise.all([
      supabase.from('shifts').select('*').eq('date', today).is('ended_at', null).limit(1),
      supabase.from('shift_handovers').select('*').order('recorded_at', { ascending: false }).limit(1),
    ]),
    supabase
      .from('pop_staff_rotation')
      .select('pop_id, user_id, last_assigned_date')
      .eq('active', true)
      .order('last_assigned_date', { ascending: true, nullsFirst: true }),
  ])

  let userRole: string | undefined = roleFromCookie ?? (user?.user_metadata?.role as string | undefined)
  const userName: string = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'Colaborador'

  // Fallback DB apenas se cookie e metadata estiverem vazios (raro)
  if (!userRole && user) {
    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    userRole = profile?.role as string | undefined
  }

  const currentShift = (shifts?.[0] ?? null) as Shift | null
  const latestHandover = (handovers?.[0] ?? null) as ShiftHandover | null
  const currentShiftType = currentShift?.type ?? null

  // ── 2. Computar rodízio no cliente (sem round-trips extras) ──────
  let agendaBlocks: AgendaPopBlock[] = []
  let useAgenda = false

  if (user) {
    const rotations = allRotationData ?? []

    // POPs em que este colaborador está no rodízio
    const myPopIds = [...new Set(
      rotations.filter(r => r.user_id === user.id).map(r => r.pop_id as string)
    )]

    if (myPopIds.length > 0) {
      useAgenda = true

      // Por POP, primeiro da lista (menor last_assigned_date) é o próximo
      const nextUserByPop: Record<string, string> = {}
      for (const r of rotations) {
        if (myPopIds.includes(r.pop_id) && !nextUserByPop[r.pop_id]) {
          nextUserByPop[r.pop_id] = r.user_id
        }
      }

      // POPs onde é a vez deste colaborador hoje
      const myTodayPopIds = myPopIds.filter(popId => nextUserByPop[popId] === user.id)

      if (myTodayPopIds.length > 0) {
        // ── Round 2 — dados dos POPs, atribuições e execuções em paralelo ──
        const [{ data: popsData }, { data: assignments }, { data: todayExecsRaw }] = await Promise.all([
          supabase
            .from('pops')
            .select('id, name, start_time_expected, deadline_time, shift_type')
            .in('id', myTodayPopIds)
            .eq('active', true)
            .order('start_time_expected', { ascending: true, nullsFirst: false }),
          supabase
            .from('resident_pop_assignments')
            .select('pop_id, resident_id, resident:residents(id, name, room_number, photo_url)')
            .in('pop_id', myTodayPopIds)
            .eq('active', true),
          supabase
            .from('executions')
            .select('pop_id, resident_id, status')
            .in('pop_id', myTodayPopIds)
            .gte('created_at', today),
        ])

        // Filtrar POPs por turno ativo
        const filteredPops = (popsData ?? []).filter(pop => {
          if (!currentShiftType) return true
          return pop.shift_type === currentShiftType || pop.shift_type === 'all'
        })

        if (filteredPops.length > 0) {
          const filteredPopIds = new Set(filteredPops.map(p => p.id))
          // Reusar execuções já buscadas (filtradas por pop_id)
          const todayExecs = (todayExecsRaw ?? []).filter(e => filteredPopIds.has(e.pop_id))

          // Status por (pop_id, resident_id)
          const STATUS_RANK: Record<string, number> = { completed: 4, in_progress: 3, late: 2, incomplete: 1, pending: 0 }
          const execStatus: Record<string, string> = {}
          for (const e of todayExecs ?? []) {
            const key = `${e.pop_id}__${e.resident_id}`
            const cur = execStatus[key]
            if (!cur || (STATUS_RANK[e.status] ?? 0) > (STATUS_RANK[cur] ?? 0)) {
              execStatus[key] = e.status
            }
          }

          // Residentes por POP (apenas os POPs do turno ativo)
          const residentsByPop: Record<string, AgendaResidentRow[]> = {}
          for (const a of (assignments ?? []).filter(a => filteredPopIds.has(a.pop_id))) {
            if (!residentsByPop[a.pop_id]) residentsByPop[a.pop_id] = []
            const res = a.resident as unknown as { id: string; name: string; room_number: string; photo_url: string | null } | null
            const status = execStatus[`${a.pop_id}__${a.resident_id}`] ?? null
            residentsByPop[a.pop_id].push({
              residentId: a.resident_id,
              residentName: res?.name ?? '',
              roomNumber: res?.room_number ?? '',
              photoUrl: res?.photo_url ?? null,
              executionStatus: status,
            })
          }

          agendaBlocks = filteredPops
            .map(pop => {
              const residents = residentsByPop[pop.id] ?? []
              return {
                popId: pop.id,
                popName: pop.name,
                startTime: pop.start_time_expected ? (pop.start_time_expected as string).slice(0, 5) : null,
                deadlineTime: pop.deadline_time ? (pop.deadline_time as string).slice(0, 5) : null,
                residents,
                completedCount: residents.filter(r => r.executionStatus === 'completed').length,
                totalCount: residents.length,
              }
            })
            .filter(b => b.totalCount > 0)
        }
      }
    }
  }

  // ── 4. Fallback: residentes filtrados por role + turno ─────────────
  let residentList: Resident[] = []
  let residentStatus: Record<string, string> = {}
  let completedToday = 0
  let lateToday = 0
  let shiftProgress = 0

  if (!useAgenda) {
    const [{ data: allResidents }, { data: todayExecs }, { data: assignments }] = await Promise.all([
      supabase.from('residents').select('*').eq('active', true).order('name'),
      supabase.from('executions').select('resident_id, status').gte('created_at', today),
      supabase.from('resident_pop_assignments')
        .select('resident_id, pop:pops(id, role_type, shift_type, active)')
        .eq('active', true),
    ])

    const relevantResidentIds = new Set<string>(
      (assignments ?? [])
        .filter((a) => {
          const pop = a.pop as unknown as { id: string; role_type: string; shift_type: string; active: boolean } | null
          if (!pop?.active) return false
          if (userRole && pop.role_type !== userRole) return false
          if (currentShiftType && pop.shift_type !== currentShiftType && pop.shift_type !== 'all') return false
          return true
        })
        .map((a) => a.resident_id as string)
    )

    residentList = (
      relevantResidentIds.size > 0 || (userRole && currentShiftType)
        ? (allResidents ?? []).filter((r) => relevantResidentIds.has(r.id))
        : (allResidents ?? [])
    ) as Resident[]

    const STATUS_RANK: Record<string, number> = { completed: 4, in_progress: 3, late: 2, incomplete: 1, pending: 0 }
    for (const e of todayExecs ?? []) {
      const cur = residentStatus[e.resident_id]
      if (!cur || (STATUS_RANK[e.status] ?? 0) > (STATUS_RANK[cur] ?? 0)) {
        residentStatus[e.resident_id] = e.status
      }
    }

    completedToday = residentList.filter(r => residentStatus[r.id] === 'completed').length
    lateToday = residentList.filter(r => residentStatus[r.id] === 'late').length
    shiftProgress = residentList.length > 0
      ? Math.round((completedToday / residentList.length) * 100)
      : 0
  } else {
    // Calcular totais a partir da agenda
    const allResidentsInAgenda = agendaBlocks.flatMap(b => b.residents)
    completedToday = agendaBlocks.reduce((acc, b) => acc + b.completedCount, 0)
    lateToday = allResidentsInAgenda.filter(r => r.executionStatus === 'late').length
    const totalAgenda = allResidentsInAgenda.length
    shiftProgress = totalAgenda > 0 ? Math.round((completedToday / totalAgenda) * 100) : 0
  }

  return (
    <div className="p-6 space-y-6">
      {/* Saudação */}
      <section className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl text-dark-800 mb-0.5 font-serif">Olá, {userName.split(' ')[0]}</h2>
          <p className="text-dark-700/60 text-sm">
            {userRole ? ROLE_LABELS[userRole] ?? userRole : ''}
            {currentShift ? ` · ${SHIFT_LABELS[currentShift.type]}` : ' · Nenhum turno ativo'}
            {' · '}{todayFormatted}
          </p>
        </div>
        <Link
          href="/shift/manage"
          className="bg-cream-100 p-3 rounded-2xl text-xl shadow-sm active:scale-95 transition-all"
        >
          ⚙️
        </Link>
      </section>

      {/* Nota do plantão anterior */}
      {latestHandover && (
        <section className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-lg">📝</span>
            <h4 className="font-bold text-blue-800 text-sm uppercase">Nota do Plantão Anterior</h4>
          </div>
          <p className="text-blue-700 text-xs leading-relaxed line-clamp-2 italic">
            &quot;{latestHandover.notes}&quot;
          </p>
          <Link href="/shift/history" className="text-[10px] font-bold text-blue-600 underline mt-2 block">
            LER RELATÓRIO COMPLETO
          </Link>
        </section>
      )}

      {/* Status do turno */}
      <section className="bg-gold-400 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-lg font-bold mb-1">Meu Turno</h3>
          <p className="text-gold-200 text-sm mb-4">
            {completedToday} de {useAgenda ? agendaBlocks.flatMap(b => b.residents).length : residentList.length} residentes atendidos
            {lateToday > 0 && <span className="ml-2 text-red-200 font-bold">· {lateToday} atrasado{lateToday > 1 ? 's' : ''}</span>}
          </p>
          <div className="w-full bg-gold-600 h-2 rounded-full overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-700"
              style={{ width: `${shiftProgress}%` }}
            />
          </div>
          {shiftProgress > 0 && (
            <p className="text-gold-200 text-xs mt-2 font-bold">{shiftProgress}% concluído</p>
          )}
        </div>
        <div className="absolute -right-4 -bottom-4 text-8xl opacity-10 rotate-12">☀️</div>
      </section>

      {/* Ações rápidas */}
      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/shift/handover"
          className="bg-white border border-cream-200 p-4 rounded-2xl flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all"
        >
          <span className="text-2xl">📤</span>
          <span className="text-[10px] font-bold text-dark-800 uppercase text-center">Passar Plantão</span>
        </Link>
        <Link
          href="/incidents/new"
          className="bg-white border border-cream-200 p-4 rounded-2xl flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all"
        >
          <span className="text-2xl">⚠️</span>
          <span className="text-[10px] font-bold text-red-600 uppercase text-center">Registrar Alerta</span>
        </Link>
      </section>

      {/* Minha Agenda (rodízio) ou Meus Residentes (fallback) */}
      {useAgenda ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-dark-800 font-serif text-lg">
              Minha Agenda
              {agendaBlocks.length > 0 && (
                <span className="ml-2 text-sm font-normal text-dark-700/50">({agendaBlocks.length} protocolo{agendaBlocks.length !== 1 ? 's' : ''})</span>
              )}
            </h3>
            <Link href="/shift/history" className="text-gold-400 text-sm font-bold">Ver histórico</Link>
          </div>

          {!currentShift && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
              <span className="font-bold">Nenhum turno ativo.</span>{' '}
              <Link href="/shift/manage" className="underline font-bold">Iniciar turno →</Link>
            </div>
          )}

          {agendaBlocks.length === 0 ? (
            <div className="text-center py-10 text-dark-700/50 text-sm bg-white rounded-2xl border border-cream-200 space-y-2">
              <p>Nenhuma tarefa atribuída para este turno.</p>
              <Link href="/shift/history" className="text-gold-400 text-xs font-bold underline">
                Ver histórico de residentes →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {agendaBlocks.map(block => {
                const pct = block.totalCount > 0 ? Math.round((block.completedCount / block.totalCount) * 100) : 0
                const lateInBlock = block.residents.filter(r => r.executionStatus === 'late').length
                return (
                  <div
                    key={block.popId}
                    className="bg-white border border-cream-200 rounded-2xl overflow-hidden shadow-sm"
                  >
                    {/* Cabeçalho do POP */}
                    <div className="flex items-center gap-4 px-4 pt-4 pb-3 border-b border-cream-100">
                      {block.startTime && (
                        <div className="shrink-0 text-center">
                          <span className="font-mono text-xl font-bold text-gold-500 leading-none">
                            {block.startTime}
                          </span>
                          {block.deadlineTime && (
                            <div className="text-[9px] text-dark-700/40 mt-0.5">até {block.deadlineTime}</div>
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-dark-800 truncate">{block.popName}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-dark-700/50">
                            {block.completedCount}/{block.totalCount} concluídos
                          </span>
                          {lateInBlock > 0 && (
                            <span className="text-[10px] font-bold text-red-500">
                              ⚠ {lateInBlock} atrasado{lateInBlock > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {/* Barra de progresso do POP */}
                        <div className="mt-2 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: pct === 100 ? '#22C55E' : lateInBlock > 0 ? '#EF4444' : '#B8864E',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lista de residentes */}
                    <div className="divide-y divide-cream-100">
                      {block.residents.map(r => {
                        const st = r.executionStatus
                          ? (EXEC_STATUS_STYLE[r.executionStatus] ?? EXEC_STATUS_STYLE.pending)
                          : null
                        const isCompleted = r.executionStatus === 'completed'
                        const isInProgress = r.executionStatus === 'in_progress'
                        const isLate = r.executionStatus === 'late'

                        return (
                          <Link
                            key={r.residentId}
                            href={isCompleted
                              ? '#'
                              : `/execution/new?residentId=${r.residentId}&popId=${block.popId}`
                            }
                            className={`flex items-center gap-3 px-4 py-3 transition-all ${
                              isCompleted ? 'opacity-50 pointer-events-none' : 'active:scale-[0.98]'
                            }`}
                            style={{
                              borderLeft: `3px solid ${st?.border ?? '#D9C9A8'}`,
                            }}
                          >
                            {/* Avatar */}
                            <div
                              className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-cream-200"
                              style={isInProgress ? { boxShadow: '0 0 0 2px #B8864E', animation: 'pulse 2s infinite' } : undefined}
                            >
                              {r.photoUrl ? (
                                <Image
                                  src={r.photoUrl}
                                  alt=""
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-gold-600 font-bold">
                                  {r.residentName.charAt(0)}
                                </span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-dark-800 text-sm truncate">{r.residentName}</div>
                              <div className="text-[11px] text-dark-700/50">Quarto {r.roomNumber}</div>
                            </div>

                            {/* Status / Ação */}
                            {isCompleted ? (
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <span className="text-green-600 font-bold">✓</span>
                              </div>
                            ) : isLate ? (
                              <div className="shrink-0 flex flex-col items-center gap-1">
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                  <span className="text-red-500">⚠</span>
                                </div>
                                <span className="text-[9px] font-bold text-red-500 uppercase">INICIAR</span>
                              </div>
                            ) : isInProgress ? (
                              <div className="shrink-0">
                                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                                  Continuar
                                </span>
                              </div>
                            ) : (
                              <div className="shrink-0">
                                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gold-50 text-gold-600 border border-gold-200 uppercase">
                                  Iniciar
                                </span>
                              </div>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      ) : (
        /* Fallback: lista de residentes (comportamento original) */
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-dark-800 font-serif text-lg">
              Meus Residentes
              {residentList.length > 0 && (
                <span className="ml-2 text-sm font-normal text-dark-700/50">({residentList.length})</span>
              )}
            </h3>
            <Link href="/shift/history" className="text-gold-400 text-sm font-bold">Ver histórico</Link>
          </div>

          {!currentShift && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
              <span className="font-bold">Nenhum turno ativo.</span>{' '}
              <Link href="/shift/manage" className="underline font-bold">Iniciar turno →</Link>
            </div>
          )}

          <div className="grid gap-3">
            {residentList.map((resident) => {
              const status = residentStatus[resident.id] ?? 'pending'
              return (
                <Link
                  key={resident.id}
                  href={`/resident/${resident.id}`}
                  className={`bg-white border p-4 rounded-2xl flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all ${
                    status === 'late' ? 'border-red-200' :
                    status === 'completed' ? 'border-green-200' :
                    status === 'in_progress' ? 'border-gold-300' :
                    'border-cream-200'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full bg-cream-200 flex items-center justify-center overflow-hidden shrink-0">
                    {resident.photo_url ? (
                      <Image
                        src={resident.photo_url}
                        alt=""
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-gold-600 font-bold text-xl">
                        {resident.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-dark-800 truncate">{resident.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs px-2 py-0.5 bg-cream-100 text-dark-700 rounded-full">
                        Quarto {resident.room_number}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        resident.dependency_level === 'bedridden' ? 'bg-red-100 text-red-600' :
                        resident.dependency_level === 'dependent' ? 'bg-orange-100 text-orange-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {resident.dependency_level === 'bedridden' ? 'Acamado' :
                         resident.dependency_level === 'dependent' ? 'Dependente' :
                         resident.dependency_level === 'semi' ? 'Semi-dep' : 'Independente'}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {status === 'completed' ? (
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-600 text-base font-bold">✓</span>
                      </div>
                    ) : status === 'in_progress' ? (
                      <div className="w-9 h-9 rounded-full bg-gold-100 border-2 border-gold-400 flex items-center justify-center animate-pulse">
                        <div className="w-3 h-3 rounded-full bg-gold-400" />
                      </div>
                    ) : status === 'late' ? (
                      <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-red-500 text-base">⚠</span>
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full border-2 border-cream-300 bg-cream-50 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full border-2 border-cream-400" />
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}

            {residentList.length === 0 && (
              <div className="text-center py-10 text-dark-700/50 text-sm bg-white rounded-2xl border border-cream-200">
                {currentShift
                  ? 'Nenhum residente atribuído ao seu perfil neste turno.'
                  : 'Inicie um turno para ver seus residentes.'}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
