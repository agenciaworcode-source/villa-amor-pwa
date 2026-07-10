'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { POP, Resident, ExecutionStatus } from '@/types'

type ResidentRow = Pick<Resident, 'id' | 'name' | 'room_number' | 'photo_url' | 'dependency_level'>
type ExecInfo    = { execId: string; status: ExecutionStatus }

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  completed:   { label: 'Concluído',    bg: '#F0FDF4', color: '#15803D', dot: '#22C55E' },
  in_progress: { label: 'Em andamento', bg: '#FFF8EE', color: '#B8864E', dot: '#B8864E' },
  late:        { label: 'Atrasado',     bg: '#FEF2F2', color: '#B91C1C', dot: '#EF4444' },
  pending:     { label: 'Pendente',     bg: '#F7F0E3', color: '#9C8E80', dot: '#D9C9A8' },
}

const NO_RESIDENT_KEY = 'no-resident'

type Filter = 'all' | 'pending' | 'in_progress' | 'completed' | 'late'

// ── Helpers de janela de tempo ────────────────────────────────────────────────

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

type WindowState = 'no_time' | 'too_early' | 'open' | 'needs_approval' | 'blocked'

function getWindowState(pop: POP, nowMinutes: number): WindowState {
  if (!pop.start_time_expected) return 'no_time'
  const expectedMin  = parseTimeToMinutes(pop.start_time_expected)
  const windowEnd    = expectedMin + (pop.activation_window_minutes ?? 15)
  const approvalEnd  = windowEnd   + (pop.late_permission_minutes ?? 10)

  if (nowMinutes < expectedMin) return 'too_early'
  if (nowMinutes <= windowEnd)  return 'open'
  if (nowMinutes <= approvalEnd) return 'needs_approval'
  return 'blocked'
}

function minutesUntilStart(pop: POP, nowMinutes: number): number {
  if (!pop.start_time_expected) return 0
  return parseTimeToMinutes(pop.start_time_expected) - nowMinutes
}

function minutesLate(pop: POP, nowMinutes: number): number {
  if (!pop.start_time_expected) return 0
  const windowEnd = parseTimeToMinutes(pop.start_time_expected) + (pop.activation_window_minutes ?? 15)
  return Math.max(0, nowMinutes - windowEnd)
}

// ── Botão/status de janela ────────────────────────────────────────────────────

function WindowBadge({ state, minutesUntil, minsLate }: {
  state: WindowState; minutesUntil: number; minsLate: number
}) {
  if (state === 'no_time') return null
  if (state === 'too_early') return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 whitespace-nowrap">
      em {minutesUntil}min
    </span>
  )
  if (state === 'open') return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 whitespace-nowrap">
      Janela aberta
    </span>
  )
  if (state === 'needs_approval') return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 whitespace-nowrap">
      +{minsLate}min late
    </span>
  )
  return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700 whitespace-nowrap">
      Bloqueado
    </span>
  )
}

// ── Botão de aprovação ────────────────────────────────────────────────────────

function ApprovalButton({ popId, minsLate }: { popId: string; minsLate: number }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const handleRequest = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading || done) return
    setLoading(true)
    try {
      const res = await fetch('/api/pop-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pop_id: popId, minutes_late: minsLate }),
      })
      if (res.ok) setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 whitespace-nowrap">
      Aguardando ADM
    </span>
  )

  return (
    <button
      onClick={handleRequest}
      disabled={loading}
      className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-amber-500 text-white whitespace-nowrap active:scale-95 transition-all disabled:opacity-60"
    >
      {loading ? '...' : 'Pedir aprovação'}
    </button>
  )
}

// ── Href helper ───────────────────────────────────────────────────────────────

function execHref(pop: POP, residentId: string | null, exec: ExecInfo | undefined): string {
  const base = residentId
    ? `/execution/new?residentId=${residentId}&popId=${pop.id}`
    : `/execution/new?popId=${pop.id}`
  if (!exec || exec.status === 'pending') return base
  if (exec.status === 'in_progress') return `/execution/${exec.execId}`
  return '#'
}

// ── Props ─────────────────────────────────────────────────────────────────────

export function TaskList({
  pops, residents, execLookup, nowMinutes = 0, hasActiveExecution = false, userId = '',
}: {
  pops:               POP[]
  residents:          ResidentRow[]
  execLookup:         Record<string, ExecInfo>
  nowMinutes?:        number
  hasActiveExecution?: boolean
  userId?:            string
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  const popsWithResident    = pops.filter(p => p.requires_resident !== false)
  const popsWithoutResident = pops.filter(p => p.requires_resident === false)
  const totalPairs = popsWithResident.length * residents.length + popsWithoutResident.length

  const stats = useMemo(() => {
    let done = 0, inProg = 0, late = 0
    for (const pop of popsWithResident) {
      for (const res of residents) {
        const e = execLookup[`${pop.id}:${res.id}`]
        if (!e) continue
        if (e.status === 'completed')   done++
        if (e.status === 'in_progress') inProg++
        if (e.status === 'late')        late++
      }
    }
    for (const pop of popsWithoutResident) {
      const e = execLookup[`${pop.id}:${NO_RESIDENT_KEY}`]
      if (!e) continue
      if (e.status === 'completed')   done++
      if (e.status === 'in_progress') inProg++
      if (e.status === 'late')        late++
    }
    return { done, inProg, late, pending: totalPairs - done - inProg - late }
  }, [popsWithResident, popsWithoutResident, residents, execLookup, totalPairs])

  const pct = totalPairs > 0 ? Math.round((stats.done / totalPairs) * 100) : 0

  const filteredPopsWithRes = useMemo(() => {
    if (filter === 'all') return popsWithResident
    return popsWithResident.filter(pop =>
      residents.some(res => (execLookup[`${pop.id}:${res.id}`]?.status ?? 'pending') === filter)
    )
  }, [filter, popsWithResident, residents, execLookup])

  const filteredPopsNoRes = useMemo(() => {
    if (filter === 'all') return popsWithoutResident
    return popsWithoutResident.filter(pop =>
      (execLookup[`${pop.id}:${NO_RESIDENT_KEY}`]?.status ?? 'pending') === filter
    )
  }, [filter, popsWithoutResident, execLookup])

  if (pops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center gap-4">
        <span className="text-5xl">📋</span>
        <div>
          <p className="font-bold text-dark-800 text-lg">Nenhum protocolo cadastrado</p>
          <p className="text-sm text-dark-700/50 mt-1">Acesse o painel administrativo para criar POPs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">

      {/* Cabeçalho */}
      <div className="bg-white border-b border-cream-200 px-5 pt-5 pb-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400 mb-0.5">{today}</p>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-serif text-dark-800">Minhas Tarefas</h1>
          <div className="text-right">
            <p className="text-2xl font-bold text-dark-800 leading-none">{pct}%</p>
            <p className="text-[10px] text-dark-700/40">concluído</p>
          </div>
        </div>
        <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-gold-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {([
            { key: 'all',         label: 'Todas',        count: totalPairs    },
            { key: 'pending',     label: 'Pendentes',    count: stats.pending },
            { key: 'in_progress', label: 'Em andamento', count: stats.inProg  },
            { key: 'late',        label: 'Atrasadas',    count: stats.late    },
            { key: 'completed',   label: 'Concluídas',   count: stats.done    },
          ] as const).map(chip => (
            <button key={chip.key} onClick={() => setFilter(chip.key as Filter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                filter === chip.key ? 'bg-dark-800 text-white' : 'bg-cream-100 text-dark-700/60'
              }`}>
              {chip.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                filter === chip.key ? 'bg-white/20 text-white' : 'bg-cream-200 text-dark-700/50'
              }`}>{chip.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {filteredPopsNoRes.length > 0 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest text-dark-700/40 px-1">Tarefas gerais</p>
            {filteredPopsNoRes.map(pop => (
              <GeneralTaskCard
                key={pop.id}
                pop={pop}
                exec={execLookup[`${pop.id}:${NO_RESIDENT_KEY}`]}
                nowMinutes={nowMinutes}
                hasActiveExecution={hasActiveExecution}
              />
            ))}
            {filteredPopsWithRes.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-dark-700/40 px-1 pt-2">Por residente</p>
            )}
          </>
        )}

        {filteredPopsWithRes.map(pop => (
          <TaskCard
            key={pop.id}
            pop={pop}
            residents={residents}
            execLookup={execLookup}
            filter={filter}
            nowMinutes={nowMinutes}
            hasActiveExecution={hasActiveExecution}
          />
        ))}

        {filteredPopsNoRes.length === 0 && filteredPopsWithRes.length === 0 && (
          <div className="bg-white border border-cream-200 rounded-2xl p-10 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="font-bold text-dark-800">Nenhuma tarefa nesta categoria</p>
          </div>
        )}
        <div className="h-4" />
      </div>
    </div>
  )
}

// ── Card tarefa GERAL ─────────────────────────────────────────────────────────

function GeneralTaskCard({ pop, exec, nowMinutes, hasActiveExecution }: {
  pop: POP; exec: ExecInfo | undefined; nowMinutes: number; hasActiveExecution: boolean
}) {
  const status      = exec?.status ?? 'pending'
  const cfg         = STATUS_CFG[status] ?? STATUS_CFG.pending
  const isCompleted = status === 'completed'
  const href        = execHref(pop, null, exec)

  const windowState = getWindowState(pop, nowMinutes)
  const minsUntil   = minutesUntilStart(pop, nowMinutes)
  const minsLate    = minutesLate(pop, nowMinutes)

  // Bloquear se sobreposição não permitida e já tem exec em andamento
  const overlapBlocked = !pop.overlap_allowed && hasActiveExecution && status === 'pending'

  const canStart = !isCompleted
    && !overlapBlocked
    && (windowState === 'open' || windowState === 'no_time' || status === 'in_progress')

  return (
    <div className={`flex items-center gap-3 bg-white border rounded-2xl px-4 py-3 shadow-sm transition-all ${
      isCompleted     ? 'opacity-60 border-green-200' :
      status === 'late' ? 'border-red-200' :
      status === 'in_progress' ? 'border-gold-200' :
      'border-cream-200'
    }`}>
      {/* Horário */}
      <div className="shrink-0 w-14 text-center">
        {pop.start_time_expected ? (
          <>
            <p className="font-mono text-base font-bold text-gold-500 leading-none">
              {(pop.start_time_expected as string).slice(0, 5)}
            </p>
            {pop.deadline_time && (
              <p className="font-mono text-[9px] text-dark-700/40 mt-0.5">
                até {(pop.deadline_time as string).slice(0, 5)}
              </p>
            )}
          </>
        ) : (
          <p className="text-[10px] text-dark-700/30 font-bold leading-tight">SEM<br/>HORA</p>
        )}
      </div>

      <div className="w-0.5 h-10 rounded-full shrink-0" style={{ background: cfg.dot }} />

      <div className="flex-1 min-w-0">
        <p className="font-bold text-dark-800 text-sm truncate">{pop.name}</p>
        <p className="text-[10px] text-dark-700/40 mt-0.5">Tarefa geral</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Janela de tempo */}
        {!isCompleted && status !== 'in_progress' && (
          <WindowBadge state={windowState} minutesUntil={minsUntil} minsLate={minsLate} />
        )}

        {/* Botão aprovação */}
        {!isCompleted && status !== 'in_progress' && windowState === 'needs_approval' && (
          <ApprovalButton popId={pop.id} minsLate={minsLate} />
        )}

        {/* Overlap warning */}
        {overlapBlocked && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
            POP em andamento
          </span>
        )}

        {/* Status badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: cfg.bg }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
          <span className="text-[10px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>

        {canStart && (
          <Link href={href} className="text-sm font-bold" style={{ color: cfg.color }}>→</Link>
        )}
      </div>
    </div>
  )
}

// ── Card tarefa COM RESIDENTE ─────────────────────────────────────────────────

function TaskCard({ pop, residents, execLookup, filter, nowMinutes, hasActiveExecution }: {
  pop: POP; residents: ResidentRow[]; execLookup: Record<string, ExecInfo>
  filter: Filter; nowMinutes: number; hasActiveExecution: boolean
}) {
  const [open, setOpen] = useState(true)

  const windowState = getWindowState(pop, nowMinutes)
  const minsUntil   = minutesUntilStart(pop, nowMinutes)
  const minsLate    = minutesLate(pop, nowMinutes)

  const rows = residents.map(res => ({ res, exec: execLookup[`${pop.id}:${res.id}`] }))
  const filteredRows = filter === 'all'
    ? rows
    : rows.filter(r => (r.exec?.status ?? 'pending') === filter)

  if (filteredRows.length === 0) return null

  const total   = rows.length
  const done    = rows.filter(r => r.exec?.status === 'completed').length
  const inProg  = rows.filter(r => r.exec?.status === 'in_progress').length
  const late    = rows.filter(r => r.exec?.status === 'late').length
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = done === total
  const hasLate = late > 0

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${
      hasLate    ? 'border-red-200'   :
      allDone    ? 'border-green-200' :
      inProg > 0 ? 'border-gold-200'  :
      'border-cream-200'
    }`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-cream-50 transition-all">
        <div className="shrink-0 w-14 text-center">
          {pop.start_time_expected ? (
            <>
              <p className="font-mono text-base font-bold text-gold-500 leading-none">
                {(pop.start_time_expected as string).slice(0, 5)}
              </p>
              {pop.deadline_time && (
                <p className="font-mono text-[9px] text-dark-700/40 mt-0.5">
                  até {(pop.deadline_time as string).slice(0, 5)}
                </p>
              )}
            </>
          ) : (
            <p className="text-[10px] text-dark-700/30 font-bold leading-tight">SEM<br/>HORA</p>
          )}
        </div>

        <div className={`w-0.5 h-10 rounded-full shrink-0 ${
          hasLate ? 'bg-red-300' : allDone ? 'bg-green-300' : inProg > 0 ? 'bg-gold-300' : 'bg-cream-300'
        }`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-dark-800 text-sm leading-tight truncate">{pop.name}</p>
            {windowState !== 'no_time' && !allDone && (
              <WindowBadge state={windowState} minutesUntil={minsUntil} minsLate={minsLate} />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1 bg-cream-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: hasLate ? '#EF4444' : allDone ? '#22C55E' : '#B8864E' }} />
            </div>
            <span className="text-[10px] text-dark-700/50 font-bold tabular-nums shrink-0">{done}/{total}</span>
          </div>
        </div>

        <span className={`text-dark-700/30 text-sm transition-transform shrink-0 ${open ? 'rotate-90' : ''}`}>›</span>
      </button>

      {open && (
        <div className="border-t border-cream-100 divide-y divide-cream-50">
          {filteredRows.map(({ res, exec }) => {
            const status      = exec?.status ?? 'pending'
            const cfg         = STATUS_CFG[status] ?? STATUS_CFG.pending
            const isCompleted = status === 'completed'
            const overlapBlocked = !pop.overlap_allowed && hasActiveExecution && status === 'pending'
            const canStart = !isCompleted && !overlapBlocked
              && (windowState === 'open' || windowState === 'no_time' || status === 'in_progress')

            return (
              <div key={res.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                  style={{ background: cfg.bg, color: cfg.color }}>
                  {res.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-dark-800 text-sm truncate">{res.name}</p>
                  <p className="text-[10px] text-dark-700/40">Qto {res.room_number}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {windowState === 'needs_approval' && !isCompleted && status !== 'in_progress' && (
                    <ApprovalButton popId={pop.id} minsLate={minsLate} />
                  )}
                  {overlapBlocked && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-600">
                      POP em andamento
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: cfg.bg }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                    <span className="text-[10px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                  {canStart && (
                    <Link href={execHref(pop, res.id, exec)}
                      className="text-sm font-bold" style={{ color: cfg.color }}>→</Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
