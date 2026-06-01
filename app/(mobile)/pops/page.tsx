import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { POP, Resident, ShiftType, ExecutionStatus } from '@/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: 'Manhã',
  evening: 'Tarde',
  night: 'Noite',
  all: 'Todos os turnos',
}

const SHIFT_ICONS: Record<ShiftType, string> = {
  morning: '🌅',
  evening: '☀️',
  night: '🌙',
  all: '◎',
}

type TodayExec = {
  id: string
  pop_id: string
  resident_id: string
  status: ExecutionStatus
}

export default async function POPsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [{ data: popsData }, { data: residentsData }, { data: todayExecsData }] = await Promise.all([
    supabase.from('pops').select('*').eq('active', true).order('shift_type').order('name'),
    supabase.from('residents').select('id, name, room_number').eq('active', true).order('name'),
    user
      ? supabase
          .from('executions')
          .select('id, pop_id, resident_id, status')
          .eq('user_id', user.id)
          .gte('created_at', todayStart.toISOString())
      : Promise.resolve({ data: [] }),
  ])

  const pops = (popsData ?? []) as POP[]
  const residents = (residentsData ?? []) as Pick<Resident, 'id' | 'name' | 'room_number'>[]
  const todayExecs = (todayExecsData ?? []) as TodayExec[]

  // Build lookup: `${pop_id}:${resident_id}` → execution
  const execMap = new Map<string, TodayExec>()
  for (const exec of todayExecs) {
    execMap.set(`${exec.pop_id}:${exec.resident_id}`, exec)
  }

  const grouped = pops.reduce<Record<string, POP[]>>((acc, pop) => {
    const key = pop.shift_type
    if (!acc[key]) acc[key] = []
    acc[key].push(pop)
    return acc
  }, {})

  const doneToday = todayExecs.filter(e => e.status === 'completed').length
  const inProgressToday = todayExecs.filter(e => e.status === 'in_progress').length

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400 mb-1">Protocolos</p>
        <h1 className="text-2xl font-serif text-dark-800">POPs Ativos</h1>
        {todayExecs.length > 0 ? (
          <p className="text-sm text-dark-700/60 mt-1">
            Hoje: <span className="text-green-600 font-bold">{doneToday} concluído{doneToday !== 1 ? 's' : ''}</span>
            {inProgressToday > 0 && <>, <span className="text-gold-500 font-bold">{inProgressToday} em andamento</span></>}
          </p>
        ) : (
          <p className="text-sm text-dark-700/60 mt-1">
            {residents.length > 0
              ? 'Selecione um POP e o residente para iniciar a execução.'
              : 'Selecione um residente na tela inicial para executar um protocolo.'}
          </p>
        )}
      </div>

      {pops.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-200 p-10 text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-bold text-dark-800 mb-1">Nenhum protocolo cadastrado</p>
          <p className="text-sm text-dark-700/50">Acesse o painel administrativo para criar POPs.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([shift, list]) => (
          <section key={shift} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">{SHIFT_ICONS[shift as ShiftType]}</span>
              <h2 className="text-xs font-bold uppercase tracking-widest text-dark-700/60">
                {SHIFT_LABELS[shift as ShiftType]}
              </h2>
            </div>
            <div className="grid gap-3">
              {list.map(pop => (
                <POPCard key={pop.id} pop={pop} residents={residents} execMap={execMap} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ExecutionStatus | undefined }) {
  if (!status) return null
  if (status === 'completed') {
    return (
      <span className="shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs font-bold">
        ✓
      </span>
    )
  }
  if (status === 'in_progress') {
    return (
      <span className="shrink-0 w-6 h-6 bg-gold-100 rounded-full flex items-center justify-center text-gold-600 text-[10px] font-bold">
        ▶
      </span>
    )
  }
  return null
}

function POPCard({
  pop,
  residents,
  execMap,
}: {
  pop: POP
  residents: Pick<Resident, 'id' | 'name' | 'room_number'>[]
  execMap: Map<string, TodayExec>
}) {
  if (residents.length === 0) {
    return (
      <div className="bg-white border border-cream-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm opacity-60">
        <div className="w-11 h-11 rounded-xl bg-gold-50 flex items-center justify-center text-lg shrink-0">📄</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-dark-800 text-sm leading-tight">{pop.name}</p>
          <p className="text-[11px] text-dark-700/50 mt-0.5">Tolerância: {pop.tolerance_minutes} min</p>
        </div>
      </div>
    )
  }

  if (residents.length === 1) {
    const exec = execMap.get(`${pop.id}:${residents[0].id}`)
    const isCompleted = exec?.status === 'completed'
    const href = exec && exec.status !== 'completed'
      ? `/execution/${exec.id}`
      : `/execution/new?residentId=${residents[0].id}&popId=${pop.id}`

    return (
      <Link
        href={isCompleted ? '#' : href}
        className={`bg-white border border-cream-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm transition-all ${isCompleted ? 'opacity-60 pointer-events-none' : 'active:scale-[0.98]'}`}
      >
        <div className="w-11 h-11 rounded-xl bg-gold-50 flex items-center justify-center text-lg shrink-0">📄</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-dark-800 text-sm leading-tight">{pop.name}</p>
          <p className="text-[11px] text-dark-700/50 mt-0.5">Tolerância: {pop.tolerance_minutes} min</p>
        </div>
        <StatusBadge status={exec?.status} />
        {!exec && <span className="text-dark-700/30 text-sm shrink-0">→</span>}
      </Link>
    )
  }

  // Multiple residents — show submenu
  return (
    <details className="group bg-white border border-cream-200 rounded-2xl shadow-sm overflow-hidden">
      <summary className="flex items-center gap-4 p-4 cursor-pointer list-none active:bg-cream-50">
        <div className="w-11 h-11 rounded-xl bg-gold-50 flex items-center justify-center text-lg shrink-0">📄</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-dark-800 text-sm leading-tight">{pop.name}</p>
          <p className="text-[11px] text-dark-700/50 mt-0.5">
            Tolerância: {pop.tolerance_minutes} min · {residents.length} residentes
          </p>
        </div>
        <span className="text-dark-700/30 text-sm group-open:rotate-90 transition-transform shrink-0">→</span>
      </summary>
      <div className="border-t border-cream-100 divide-y divide-cream-100">
        {residents.map(r => {
          const exec = execMap.get(`${pop.id}:${r.id}`)
          const isCompleted = exec?.status === 'completed'
          const href = exec && exec.status !== 'completed'
            ? `/execution/${exec.id}`
            : `/execution/new?residentId=${r.id}&popId=${pop.id}`

          return (
            <Link
              key={r.id}
              href={isCompleted ? '#' : href}
              className={`flex items-center gap-3 px-4 py-3 transition-all ${isCompleted ? 'opacity-60 pointer-events-none' : 'active:bg-cream-50'}`}
            >
              <div className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-gold-600 font-bold text-sm shrink-0">
                {r.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-dark-800">{r.name}</p>
                <p className="text-[10px] text-dark-700/50">Quarto {r.room_number}</p>
              </div>
              <StatusBadge status={exec?.status} />
              {!exec && <span className="text-gold-400 text-sm font-bold shrink-0">→</span>}
            </Link>
          )
        })}
      </div>
    </details>
  )
}
