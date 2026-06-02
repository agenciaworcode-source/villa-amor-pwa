'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { SectionHeader, Card, StatusBadge, Btn, EmptyState } from './ui'
import { Execution, Resident, POP, ExecutionStep } from '@/types'

type StepSummary = Pick<ExecutionStep, 'id' | 'status' | 'completed_at'>
type ExecWithDetails = Execution & {
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
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
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
            .select('*, resident:residents(*), pop:pops(*), user:users(id, name), steps:execution_steps(id, status, completed_at)')
            .eq('id', newExec.id)
            .single()
          if (data) setExecutions(prev => [data as ExecWithDetails, ...prev])
        }
      )
      // Step atualizado (check-in / check-out de etapa) — atualiza progresso
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'execution_steps' },
        (payload) => {
          const step = payload.new as StepSummary & { execution_id: string }
          setExecutions(prev =>
            prev.map(e => {
              if (e.id !== step.execution_id) return e
              const updatedSteps = (e.steps ?? []).map(s =>
                s.id === step.id ? { ...s, status: step.status, completed_at: step.completed_at } : s
              )
              return { ...e, steps: updatedSteps }
            })
          )
        }
      )
      // Novo step inserido — adiciona ao array de steps da execução
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'execution_steps' },
        (payload) => {
          const step = payload.new as StepSummary & { execution_id: string }
          setExecutions(prev =>
            prev.map(e => {
              if (e.id !== step.execution_id) return e
              return { ...e, steps: [...(e.steps ?? []), step] }
            })
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = filter === 'all' ? executions : executions.filter(e => e.status === filter)

  return (
    <div>
      <SectionHeader
        eyebrow="Turno Ativo · Hoje"
        title="Execuções de POP"
        sub="Histórico completo de execuções e evidências do turno"
        action={<Btn variant="secondary" size="sm" onClick={() => exportToCSV(filtered)}>⬇ Exportar CSV</Btn>}
      />

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px 80px 70px 90px', gap: 12, padding: '10px 20px', borderBottom: '2px solid #F7F0E3', background: '#FDFAF5', borderRadius: '12px 12px 0 0' }}>
          {['POP', 'Residente', 'Colaborador', 'Início', 'Duração', 'Etapas', 'Status'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#9C8E80' }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="◈" title="Nenhuma execução encontrada" sub="Tente ajustar os filtros ou aguarde o início das execuções" />
        ) : filtered.map((e, i) => {
          const initials = e.resident?.name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('') ?? 'RR'
          const duration = e.completed_at && e.started_at
            ? `${Math.round((new Date(e.completed_at).getTime() - new Date(e.started_at).getTime()) / 60000)} min`
            : '—'
          const totalSteps     = e.steps?.length ?? 0
          const completedSteps = e.steps?.filter(s => s.status === 'completed').length ?? 0
          const stepLabel      = totalSteps > 0 ? `${completedSteps}/${totalSteps}` : '—'
          const stepColor      = totalSteps === 0 ? '#9C8E80' : completedSteps === totalSteps ? '#22C55E' : completedSteps > 0 ? '#B8864E' : '#9C8E80'
          return (
            <div
              key={e.id}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px 80px 70px 90px', gap: 12, padding: '13px 20px', borderBottom: i < filtered.length - 1 ? '1px solid #F7F0E3' : 'none', alignItems: 'center', cursor: 'pointer' }}
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
            </div>
          )
        })}
      </Card>
    </div>
  )
}
