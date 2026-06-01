import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { Resident, POP } from '@/types'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const SHIFT_LABELS: Record<string, string> = {
  morning: 'Diurno',
  evening: 'Vespertino',
  night:   'Noturno',
  all:     'Todos os Turnos',
}

function POPStatusBadge({ status }: { status: string | undefined }) {
  if (status === 'completed')
    return (
      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
        Concluído ✓
      </span>
    )
  if (status === 'in_progress')
    return (
      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gold-100 text-gold-700 animate-pulse">
        Em andamento
      </span>
    )
  if (status === 'late')
    return (
      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">
        Atrasado ⚠
      </span>
    )
  return (
    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-cream-100 text-dark-700/60">
      Não iniciado
    </span>
  )
}

export default async function ResidentPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const today = new Date().toISOString().split('T')[0]

  // ── 1. Usuário e role ──────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = user?.user_metadata?.role as string | undefined
  if (!userRole && user) {
    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    userRole = profile?.role as string | undefined
  }

  // ── 2. Turno ativo ─────────────────────────────────────────────────
  const { data: shiftData } = await supabase
    .from('shifts').select('type').eq('date', today).is('ended_at', null).maybeSingle()
  const currentShiftType = shiftData?.type ?? null

  // ── 3. Residente + atribuições + execuções de hoje ─────────────────
  const [{ data: resident }, { data: assignments }, { data: todayExecs }] = await Promise.all([
    supabase.from('residents').select('*').eq('id', params.id).single(),
    supabase
      .from('resident_pop_assignments')
      .select('pop:pops(*)')
      .eq('resident_id', params.id)
      .eq('active', true),
    supabase
      .from('executions')
      .select('pop_id, status')
      .eq('resident_id', params.id)
      .gte('created_at', today),
  ])

  if (!resident) notFound()

  const residentData = resident as Resident

  // ── 4. Filtrar POPs por role + turno ──────────────────────────────
  const STATUS_RANK: Record<string, number> = { completed: 4, in_progress: 3, late: 2, incomplete: 1, pending: 0 }

  // Melhor status por POP (pode haver múltiplas execuções)
  const popStatus: Record<string, string> = {}
  for (const e of todayExecs ?? []) {
    const cur = popStatus[e.pop_id]
    if (!cur || (STATUS_RANK[e.status] ?? 0) > (STATUS_RANK[cur] ?? 0)) {
      popStatus[e.pop_id] = e.status
    }
  }

  const allPops = (assignments ?? [])
    .map((row: any) => row.pop as POP)
    .filter((p) => {
      if (!p?.active) return false
      // Filtra por role do colaborador (se conhecido)
      if (userRole && p.role_type !== userRole) return false
      // Filtra por turno (shift_type 'all' sempre aparece)
      if (currentShiftType && p.shift_type !== currentShiftType && p.shift_type !== 'all') return false
      return true
    })
    .sort((a, b) => {
      // Ordena: atrasados primeiro, depois pendentes, depois em andamento, concluídos por último
      const rankA = STATUS_RANK[popStatus[a.id] ?? 'pending'] ?? 0
      const rankB = STATUS_RANK[popStatus[b.id] ?? 'pending'] ?? 0
      return rankA - rankB
    })

  return (
    <div className="p-6 space-y-6">
      {/* Header com botão de alerta */}
      <div className="flex justify-end">
        <Link
          href={`/incidents/new?residentId=${residentData.id}`}
          className="bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border border-red-100 active:scale-95 transition-all"
        >
          ⚠️ REGISTRAR ALERTA
        </Link>
      </div>

      {/* Foto e nome */}
      <section className="flex flex-col items-center text-center space-y-4">
        <div className="w-32 h-32 rounded-3xl bg-cream-200 shadow-md overflow-hidden flex items-center justify-center border-4 border-white">
          {residentData.photo_url ? (
            <img
              src={residentData.photo_url}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-gold-600 font-bold text-4xl">
              {residentData.name.charAt(0)}
            </span>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-serif text-dark-800">{residentData.name}</h2>
          <p className="text-dark-700/60">{residentData.nickname || 'Sem apelido'}</p>
        </div>
      </section>

      {/* Info básica */}
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-dark-700/50 mb-1 font-bold">Quarto</p>
          <p className="font-bold text-dark-800">{residentData.room_number}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-dark-700/50 mb-1 font-bold">Dependência</p>
          <p className="font-bold text-dark-800 text-sm capitalize">{residentData.dependency_level}</p>
        </div>
      </section>

      {/* Aviso de turno inativo */}
      {!currentShiftType && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          <span className="font-bold">Nenhum turno ativo.</span>{' '}
          <Link href="/shift/manage" className="underline font-bold">Iniciar turno →</Link>
        </div>
      )}

      {/* POPs */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-dark-800 font-serif text-lg">Protocolos do Turno</h3>
          {currentShiftType && (
            <span className="text-[10px] font-bold text-gold-600 bg-gold-50 px-2 py-1 rounded-full border border-gold-200">
              {SHIFT_LABELS[currentShiftType]}
            </span>
          )}
        </div>

        {allPops.length === 0 ? (
          <div className="text-center py-8 text-dark-700/50 text-sm bg-white rounded-2xl border border-cream-200">
            {currentShiftType
              ? 'Nenhum protocolo atribuído para o seu perfil neste turno.'
              : 'Inicie um turno para ver os protocolos disponíveis.'}
          </div>
        ) : (
          <div className="grid gap-3">
            {allPops.map((pop) => {
              const status = popStatus[pop.id]
              const isCompleted = status === 'completed'
              return (
                <Link
                  key={pop.id}
                  href={`/execution/new?residentId=${residentData.id}&popId=${pop.id}`}
                  className={`bg-white border p-5 rounded-2xl flex items-center justify-between shadow-sm transition-all ${
                    isCompleted
                      ? 'border-green-200 opacity-70 active:scale-[0.99]'
                      : status === 'late'
                      ? 'border-red-200 active:scale-[0.98]'
                      : 'border-cream-200 active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                      isCompleted ? 'bg-green-50' :
                      status === 'late' ? 'bg-red-50' :
                      status === 'in_progress' ? 'bg-gold-50' :
                      'bg-cream-50'
                    }`}>
                      {isCompleted ? '✅' : status === 'late' ? '⚠️' : '📄'}
                    </div>
                    <div>
                      <h4 className="font-bold text-dark-800">{pop.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <POPStatusBadge status={status} />
                        {pop.deadline_time && (
                          <span className="text-[10px] text-dark-700/40">
                            Prazo: {pop.deadline_time.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isCompleted ? (
                    <div className="w-10 h-10 rounded-full bg-gold-400 flex items-center justify-center text-white shadow-md shrink-0">
                      →
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                      ✓
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
