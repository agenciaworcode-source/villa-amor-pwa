'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { SectionHeader, Card, StatusBadge, Btn, EmptyState } from './ui'
import { Execution, Resident, POP, ExecutionStep } from '@/types'

type PopStepMeta = { title: string; order_index: number; is_mandatory: boolean }
type StepSummary = Pick<ExecutionStep, 'id' | 'status' | 'completed_at'> & {
  pop_step?: PopStepMeta | null
}
type ExecWithDetails = Omit<Execution, 'steps'> & {
  resident: Resident
  pop: POP
  user: { id: string; name: string } | null
  steps?: StepSummary[] | null
}

const FILTERS = [
  { id: 'all',         label: 'Todas' },
  { id: 'completed',   label: 'Concluídas' },
  { id: 'in_progress', label: 'Em andamento' },
  { id: 'late',        label: 'Atrasadas' },
  { id: 'pending',     label: 'Pendentes' },
]

const STATUS_LABELS: Record<string, string> = {
  completed: 'Concluída', in_progress: 'Em andamento', late: 'Atrasada',
  pending: 'Pendente', incomplete: 'Incompleta',
}

const STEP_ICON: Record<string, { icon: string; color: string }> = {
  completed:   { icon: '✓', color: '#22C55E' },
  in_progress: { icon: '▶', color: '#B8864E' },
  pending:     { icon: '○', color: '#C4B8A8' },
  skipped:     { icon: '—', color: '#C4B8A8' },
}

function exportToCSV(rows: ExecWithDetails[]) {
  const headers = ['POP', 'Residente', 'Quarto', 'Colaborador', 'Início', 'Conclusão', 'Duração (min)', 'Status']
  const data = rows.map(e => {
    const durationMin = e.completed_at && e.started_at
      ? String(Math.round((new Date(e.completed_at).getTime() - new Date(e.started_at).getTime()) / 60000))
      : ''
    return [
      e.pop?.name ?? '',
      e.resident?.name ?? '',
      e.resident?.room_number ?? '',
      e.user?.name ?? '',
      e.started_at ? new Date(e.started_at).toLocaleString('pt-BR') : '',
      e.completed_at ? new Date(e.completed_at).toLocaleString('pt-BR') : '',
      durationMin,
      STATUS_LABELS[e.status] ?? e.status,
    ]
  })
  const csv = [headers, ...data]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `execucoes_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function ExecutionsClient({ executions: initial }: { executions: ExecWithDetails[] }) {
  const [executions, setExecutions] = useState<ExecWithDetails[]>(initial)
  const [filter, setFilter]         = useState('all')
  const [userId, setUserId]         = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Colaboradores únicos presentes nas execuções carregadas
  const collaborators = Array.from(
    new Map(
      executions
        .filter(e => e.user)
        .map(e => [e.user!.id, e.user!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  // Realtime: atualiza execuções e steps quando colaborador avança tarefas
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('executions-dashboard')
      // Execution atualizada (status, completed_at)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'executions' },
        (payload) => {
          const updated = payload.new as Execution
          setExecutions(prev =>
            prev.map(e =>
              e.id === updated.id
                ? { ...e, status: updated.status, completed_at: updated.completed_at, started_at: updated.started_at }
                : e
            )
          )
        }
      )
      // Nova execução criada — busca com todos os detalhes
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'executions' },
        async (payload) => {
          const newExec = payload.new as Execution
          const supabase2 = createClient()
          const { data } = await supabase2
            .from('executions')
            .select(`*, resident:residents(*), pop:pops(*), user:users(id, name),
              steps:execution_steps(id, status, completed_at, pop_step:pop_steps(title, order_index, is_mandatory))`)
            .eq('id', newExec.id)
            .single()
          if (data) setExecutions(prev => [data as ExecWithDetails, ...prev])
        }
      )
      // Step atualizado (check-in / check-out de etapa) — atualiza status em tempo real
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'execution_steps' },
        (payload) => {
          const step = payload.new as { id: string; execution_id: string; status: string; completed_at: string | null }
          setExecutions(prev =>
            prev.map(e => {
              if (e.id !== step.execution_id) return e
              const updatedSteps = (e.steps ?? []).map(s =>
                s.id === step.id
                  ? { ...s, status: step.status as StepSummary['status'], completed_at: step.completed_at }
                  : s
              )
              return { ...e, steps: updatedSteps }
            })
          )
        }
      )
      // Novo step inserido — adiciona ao array preservando pop_step se já existir
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'execution_steps' },
        (payload) => {
          const step = payload.new as { id: string; execution_id: string; status: string; completed_at: string | null }
          setExecutions(prev =>
            prev.map(e => {
              if (e.id !== step.execution_id) return e
              // Evita duplicatas
              if (e.steps?.some(s => s.id === step.id)) return e
              const newStep: StepSummary = { id: step.id, status: step.status as StepSummary['status'], completed_at: step.completed_at }
              return { ...e, steps: [...(e.steps ?? []), newStep] }
            })
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = executions
    .filter(e => filter === 'all' || e.status === filter)
    .filter(e => userId === null || e.user?.id === userId)

  return (
    <div>
      <SectionHeader
        eyebrow="Turno Ativo · Hoje"
        title="Execuções de POP"
        sub="Histórico completo de execuções e evidências do turno"
        action={<Btn variant="secondary" size="sm" onClick={() => exportToCSV(filtered)}>⬇ Exportar CSV</Btn>}
      />

      {/* Filtro por colaborador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9C8E80', marginRight: 2 }}>Colaborador</span>
        <button
          onClick={() => setUserId(null)}
          style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${userId === null ? '#5C5248' : '#EDE0C8'}`, background: userId === null ? '#5C5248' : 'white', color: userId === null ? 'white' : '#5C5248', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-lato)' }}
        >
          Todos
        </button>
        {collaborators.map(c => (
          <button
            key={c.id}
            onClick={() => setUserId(userId === c.id ? null : c.id)}
            style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${userId === c.id ? '#5C5248' : '#EDE0C8'}`, background: userId === c.id ? '#5C5248' : 'white', color: userId === c.id ? 'white' : '#5C5248', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-lato)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: userId === c.id ? 'rgba(255,255,255,0.2)' : '#F7F0E3', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: userId === c.id ? 'white' : '#B8864E', flexShrink: 0 }}>
              {c.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
            </span>
            {c.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Filtro por status */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{ padding: '7px 13px', borderRadius: 8, border: `1.5px solid ${filter === f.id ? '#B8864E' : '#EDE0C8'}`, background: filter === f.id ? '#B8864E' : 'white', color: filter === f.id ? 'white' : '#5C5248', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-lato)' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        {/* Header da tabela */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px 80px 70px 90px 32px', gap: 12, padding: '10px 20px', borderBottom: '2px solid #F7F0E3', background: '#FDFAF5', borderRadius: '12px 12px 0 0' }}>
          {['POP', 'Residente', 'Colaborador', 'Início', 'Duração', 'Etapas', 'Status', ''].map((h, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#9C8E80' }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="◈" title="Nenhuma execução encontrada" sub="Tente ajustar os filtros ou aguarde o início das execuções" />
        ) : filtered.map((e, i) => {
          const isExpanded     = expandedId === e.id
          const initials       = e.resident?.name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('') ?? 'RR'
          const duration       = e.completed_at && e.started_at
            ? `${Math.round((new Date(e.completed_at).getTime() - new Date(e.started_at).getTime()) / 60000)} min`
            : '—'
          const sortedSteps    = [...(e.steps ?? [])].sort((a, b) =>
            (a.pop_step?.order_index ?? 0) - (b.pop_step?.order_index ?? 0)
          )
          const totalSteps     = sortedSteps.length
          const completedSteps = sortedSteps.filter(s => s.status === 'completed').length
          const stepLabel      = totalSteps > 0 ? `${completedSteps}/${totalSteps}` : '—'
          const stepColor      = totalSteps === 0 ? '#9C8E80' : completedSteps === totalSteps ? '#22C55E' : completedSteps > 0 ? '#B8864E' : '#9C8E80'
          const isLast         = i === filtered.length - 1

          return (
            <div key={e.id}>
              {/* Linha principal */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : e.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 100px 80px 70px 90px 32px',
                  gap: 12,
                  padding: '13px 20px',
                  borderBottom: (!isExpanded && !isLast) ? '1px solid #F7F0E3' : 'none',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: isExpanded ? '#FDFAF5' : undefined,
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1C' }}>{e.pop?.name ?? '—'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#B8864E', flexShrink: 0 }}>
                    {initials}
                  </div>
                  <span style={{ fontSize: 12, color: '#5C5248' }}>{e.resident?.name ?? '—'}</span>
                </div>
                <span style={{ fontSize: 12, color: '#9C8E80' }}>{e.user?.name ?? '—'}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#5C5248' }}>
                  {e.started_at ? new Date(e.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#9C8E80' }}>{duration}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: stepColor }}>{stepLabel}</span>
                <StatusBadge status={e.status} />
                {/* Chevron */}
                <span style={{ fontSize: 12, color: '#B8864E', textAlign: 'center', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'block' }}>
                  ▾
                </span>
              </div>

              {/* Dropdown de etapas */}
              {isExpanded && (
                <div style={{
                  borderBottom: !isLast ? '1px solid #F7F0E3' : 'none',
                  background: '#FDFAF5',
                  padding: '0 20px 14px 56px',
                }}>
                  {sortedSteps.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#9C8E80', fontStyle: 'italic', paddingTop: 8 }}>Nenhuma etapa registrada ainda.</p>
                  ) : sortedSteps.map(step => {
                    const cfg = STEP_ICON[step.status] ?? STEP_ICON.pending
                    const time = step.completed_at
                      ? new Date(step.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                      : null
                    return (
                      <div
                        key={step.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '6px 0',
                          borderBottom: '1px dashed #EDE0C8',
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color, width: 16, textAlign: 'center', flexShrink: 0 }}>
                          {cfg.icon}
                        </span>
                        <span style={{ fontSize: 12, color: step.status === 'completed' ? '#1C1C1C' : '#9C8E80', flex: 1, fontWeight: step.status === 'completed' ? 600 : 400 }}>
                          {step.pop_step?.title ?? `Etapa ${step.id.slice(0, 4)}`}
                          {step.pop_step?.is_mandatory === false && (
                            <span style={{ fontSize: 9, color: '#C4B8A8', marginLeft: 6, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>opcional</span>
                          )}
                        </span>
                        {time && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#22C55E' }}>{time}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
