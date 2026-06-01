import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { POP, Resident, ShiftType } from '@/types'
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

export default async function POPsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const [{ data: popsData }, { data: residentsData }] = await Promise.all([
    supabase.from('pops').select('*').eq('active', true).order('shift_type').order('name'),
    supabase.from('residents').select('id, name, room_number').eq('active', true).order('name'),
  ])

  const pops = (popsData ?? []) as POP[]
  const residents = (residentsData ?? []) as Pick<Resident, 'id' | 'name' | 'room_number'>[]

  const grouped = pops.reduce<Record<string, POP[]>>((acc, pop) => {
    const key = pop.shift_type
    if (!acc[key]) acc[key] = []
    acc[key].push(pop)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400 mb-1">Protocolos</p>
        <h1 className="text-2xl font-serif text-dark-800">POPs Ativos</h1>
        <p className="text-sm text-dark-700/60 mt-1">
          {residents.length > 0
            ? 'Selecione um POP e escolha o residente para iniciar a execução.'
            : 'Selecione um residente na tela inicial para executar um protocolo.'}
        </p>
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
                <POPCard key={pop.id} pop={pop} residents={residents} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function POPCard({
  pop,
  residents,
}: {
  pop: POP
  residents: Pick<Resident, 'id' | 'name' | 'room_number'>[]
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
    return (
      <Link
        href={`/execution/new?residentId=${residents[0].id}&popId=${pop.id}`}
        className="bg-white border border-cream-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all"
      >
        <div className="w-11 h-11 rounded-xl bg-gold-50 flex items-center justify-center text-lg shrink-0">📄</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-dark-800 text-sm leading-tight">{pop.name}</p>
          <p className="text-[11px] text-dark-700/50 mt-0.5">Tolerância: {pop.tolerance_minutes} min</p>
        </div>
        <span className="text-dark-700/30 text-sm">→</span>
      </Link>
    )
  }

  // Multiple residents — show a submenu of residents
  return (
    <details className="group bg-white border border-cream-200 rounded-2xl shadow-sm overflow-hidden">
      <summary className="flex items-center gap-4 p-4 cursor-pointer list-none active:bg-cream-50">
        <div className="w-11 h-11 rounded-xl bg-gold-50 flex items-center justify-center text-lg shrink-0">📄</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-dark-800 text-sm leading-tight">{pop.name}</p>
          <p className="text-[11px] text-dark-700/50 mt-0.5">Tolerância: {pop.tolerance_minutes} min · {residents.length} residentes</p>
        </div>
        <span className="text-dark-700/30 text-sm group-open:rotate-90 transition-transform">→</span>
      </summary>
      <div className="border-t border-cream-100 divide-y divide-cream-100">
        {residents.map(r => (
          <Link
            key={r.id}
            href={`/execution/new?residentId=${r.id}&popId=${pop.id}`}
            className="flex items-center gap-3 px-4 py-3 active:bg-cream-50 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-gold-600 font-bold text-sm shrink-0">
              {r.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-dark-800">{r.name}</p>
              <p className="text-[10px] text-dark-700/50">Quarto {r.room_number}</p>
            </div>
            <span className="text-gold-400 text-sm font-bold">→</span>
          </Link>
        ))}
      </div>
    </details>
  )
}
