'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/utils/supabase/client'
import { SectionHeader, Card, StatusBadge, Btn, EmptyState } from './ui'
import { Execution, Resident, POP, ExecutionStep } from '@/types'
import { requeueExecution } from '@/app/actions/executions'

// ─── tipos ────────────────────────────────────────────────────────────────────

type PopStepMeta  = { title: string; order_index: number; is_mandatory: boolean }
type MediaSummary = { storage_path: string; type: 'photo' | 'video' }
type StepSummary  = Pick<ExecutionStep, 'id' | 'status' | 'completed_at'> & {
  pop_step?: PopStepMeta | null
  media?:    MediaSummary[] | null
}
type ExecWithDetails = Omit<Execution, 'steps'> & {
  resident: Resident
  pop:  POP
  user: { id: string; name: string } | null
  steps?: StepSummary[] | null
}

// ─── constantes ───────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
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

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function statusColor(status: string) {
  if (status === 'completed')   return '#22C55E'
  if (status === 'late')        return '#EF4444'
  if (status === 'in_progress') return '#B8864E'
  return '#C4B8A8'
}

function exportToCSV(rows: ExecWithDetails[]) {
  const headers = ['POP', 'Residente', 'Quarto', 'Colaborador', 'Início', 'Conclusão', 'Duração (min)', 'Status']
  const data = rows.map(e => {
    const durationMin = e.completed_at && e.started_at
      ? String(Math.round((new Date(e.completed_at).getTime() - new Date(e.started_at).getTime()) / 60000))
      : ''
    return [
      e.pop?.name ?? '', e.resident?.name ?? '', e.resident?.room_number ?? '',
      e.user?.name ?? '',
      e.started_at ? new Date(e.started_at).toLocaleString('pt-BR') : '',
      e.completed_at ? new Date(e.completed_at).toLocaleString('pt-BR') : '',
      durationMin, STATUS_LABELS[e.status] ?? e.status,
    ]
  })
  const csv = [headers, ...data].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `execucoes_${new Date().toISOString().split('T')[0]}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ─── MediaThumb — carrega URL via API route (service role) ────────────────────

function MediaThumb({ path, mediaType }: { path: string; mediaType: 'photo' | 'video' }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/media-url?path=${encodeURIComponent(path)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.url) setUrl(d.url) })
  }, [path])

  if (mediaType === 'video') {
    return (
      <a href={url ?? '#'} target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: '#1C1C1C', borderRadius: 6, color: 'white', fontSize: 11, fontWeight: 700, textDecoration: 'none', opacity: url ? 1 : 0.4, pointerEvents: url ? 'auto' : 'none' }}>
        🎥 Ver vídeo
      </a>
    )
  }
  if (!url) return <div style={{ width: 56, height: 56, background: '#F7F0E3', borderRadius: 8, flexShrink: 0, animation: 'pulse 1.5s infinite' }} />
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="evidência" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '2px solid #EDE0C8', cursor: 'zoom-in', display: 'block' }} />
    </a>
  )
}

// ─── ExecutionCard — card de uma execução com steps expansíveis ───────────────

function ExecutionCard({ e, onRequeue }: { e: ExecWithDetails; onRequeue: (id: string) => void }) {
  const [expanded, setExpanded]   = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  const sortedSteps    = [...(e.steps ?? [])].sort((a, b) => (a.pop_step?.order_index ?? 0) - (b.pop_step?.order_index ?? 0))
  const totalSteps     = sortedSteps.length
  const completedSteps = sortedSteps.filter(s => s.status === 'completed').length
  const pct            = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0
  const residentName   = e.resident?.name ?? null
  const startTime      = e.started_at ? new Date(e.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'
  const duration       = e.completed_at && e.started_at
    ? `${Math.round((new Date(e.completed_at).getTime() - new Date(e.started_at).getTime()) / 60000)} min`
    : null

  const canRequeue = ['completed', 'late', 'incomplete', 'in_progress'].includes(e.status)

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #EDE0C8', overflow: 'hidden', marginBottom: 10 }}>
      {/* cabeçalho do card */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1C', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {e.pop?.name ?? '—'}
            </p>
            {residentName && (
              <p style={{ fontSize: 11, color: '#9C8E80' }}>
                {residentName}{e.resident?.room_number ? ` · Quarto ${e.resident.room_number}` : ''}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <StatusBadge status={e.status} />
            <span style={{ fontSize: 13, color: '#B8864E', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'block' }}>▾</span>
          </div>
        </div>

        {/* barra de progresso */}
        <div style={{ height: 5, background: '#F7F0E3', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22C55E' : '#B8864E', borderRadius: 4, transition: 'width 0.4s ease' }} />
        </div>

        {/* rodapé do cabeçalho */}
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#9C8E80' }}>
          <span style={{ fontFamily: 'var(--font-mono)' }}>⏱ {startTime}</span>
          {duration && <span style={{ fontFamily: 'var(--font-mono)' }}>🕐 {duration}</span>}
          <span style={{ fontWeight: 700, color: pct === 100 ? '#22C55E' : '#B8864E' }}>{completedSteps}/{totalSteps} etapas</span>
        </div>
      </div>

      {/* lista de steps */}
      {expanded && (
        <div style={{ borderTop: '1px solid #F7F0E3', padding: '12px 16px' }}>
          {sortedSteps.length === 0 ? (
            <p style={{ fontSize: 12, color: '#9C8E80', fontStyle: 'italic' }}>Nenhuma etapa registrada ainda.</p>
          ) : sortedSteps.map(step => {
            const cfg  = STEP_ICON[step.status] ?? STEP_ICON.pending
            const time = step.completed_at
              ? new Date(step.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : null
            return (
              <div key={step.id} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '1px dashed #F7F0E3' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, width: 14, flexShrink: 0, textAlign: 'center' }}>{cfg.icon}</span>
                  <span style={{ fontSize: 12, flex: 1, color: step.status === 'completed' ? '#1C1C1C' : '#9C8E80', fontWeight: step.status === 'completed' ? 600 : 400 }}>
                    {step.pop_step?.title ?? `Etapa`}
                    {step.pop_step?.is_mandatory === false && (
                      <span style={{ fontSize: 9, color: '#C4B8A8', marginLeft: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>opcional</span>
                    )}
                  </span>
                  {time && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#22C55E', flexShrink: 0 }}>{time}</span>}
                </div>
                {step.media && step.media.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingLeft: 22, flexWrap: 'wrap' }}>
                    {step.media.map((m, mi) => <MediaThumb key={mi} path={m.storage_path} mediaType={m.type} />)}
                  </div>
                )}
              </div>
            )
          })}

          {/* ação de reenvio */}
          {canRequeue && (
            <div style={{ marginTop: 6 }}>
              {confirming ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#FEF2F2', borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: '#5C5248', flex: 1 }}>Resetar todas as etapas e reenviar para execução?</span>
                  <button disabled={isPending} onClick={() => {
                    startTransition(async () => {
                      const r = await requeueExecution(e.id)
                      if (!r.error) onRequeue(e.id)
                      setConfirming(false)
                    })
                  }} style={{ padding: '4px 12px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {isPending ? '...' : 'Confirmar'}
                  </button>
                  <button onClick={() => setConfirming(false)} style={{ padding: '4px 12px', background: '#F7F0E3', color: '#5C5248', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirming(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1.5px dashed #EDE0C8', borderRadius: 8, background: 'white', color: '#9C8E80', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  ↺ Reenviar para execução
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CollaboratorCard — visão resumida por colaborador ────────────────────────

function CollaboratorCard({
  user, executions, onClick,
}: {
  user: { id: string; name: string }
  executions: ExecWithDetails[]
  onClick: () => void
}) {
  const total     = executions.length
  const done      = executions.filter(e => e.status === 'completed').length
  const late      = executions.filter(e => e.status === 'late').length
  const inProg    = executions.filter(e => e.status === 'in_progress').length
  const totalSteps     = executions.reduce((acc, e) => acc + (e.steps?.length ?? 0), 0)
  const completedSteps = executions.reduce((acc, e) => acc + (e.steps?.filter(s => s.status === 'completed').length ?? 0), 0)
  const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  const overallStatus = late > 0 ? 'late' : inProg > 0 ? 'in_progress' : done === total && total > 0 ? 'completed' : 'pending'

  return (
    <div
      onClick={onClick}
      style={{ background: 'white', border: '1.5px solid #EDE0C8', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s', display: 'flex', alignItems: 'center', gap: 16 }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(184,134,78,0.12)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#B8864E' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; (e.currentTarget as HTMLDivElement).style.borderColor = '#EDE0C8' }}
    >
      {/* avatar */}
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#B8864E', flexShrink: 0, border: `2px solid ${statusColor(overallStatus)}` }}>
        {initials(user.name)}
      </div>

      {/* info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1C', marginBottom: 6 }}>{user.name}</p>
        <div style={{ height: 4, background: '#F7F0E3', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22C55E' : '#B8864E', borderRadius: 4 }} />
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#9C8E80' }}>
          <span>{total} {total === 1 ? 'protocolo' : 'protocolos'}</span>
          <span style={{ color: '#22C55E', fontWeight: 700 }}>{done} concluído{done !== 1 ? 's' : ''}</span>
          {late > 0 && <span style={{ color: '#EF4444', fontWeight: 700 }}>{late} atrasado{late !== 1 ? 's' : ''}</span>}
          {inProg > 0 && <span style={{ color: '#B8864E', fontWeight: 700 }}>{inProg} em andamento</span>}
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: pct === 100 ? '#22C55E' : '#B8864E' }}>{pct}%</span>
        </div>
      </div>

      <span style={{ color: '#B8864E', fontSize: 16 }}>›</span>
    </div>
  )
}

// ─── componente principal ──────────────────────────────────────────────────────

export function ExecutionsClient({ executions: initial }: { executions: ExecWithDetails[] }) {
  const [executions, setExecutions] = useState<ExecWithDetails[]>(initial)
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null)
  const [filter, setFilter]             = useState('all')

  // Lista de colaboradores únicos
  const collaborators = Array.from(
    new Map(executions.filter(e => e.user).map(e => [e.user!.id, e.user!])).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  // Realtime: execuções e steps
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('executions-dashboard')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'executions' }, (payload) => {
        const updated = payload.new as Execution
        setExecutions(prev => prev.map(e =>
          e.id === updated.id ? { ...e, status: updated.status, completed_at: updated.completed_at, started_at: updated.started_at } : e
        ))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'executions' }, async (payload) => {
        const supabase2 = createClient()
        const { data } = await supabase2.from('executions')
          .select(`*, resident:residents(*), pop:pops(*), user:users(id, name),
            steps:execution_steps(id, status, completed_at, pop_step:pop_steps(title, order_index, is_mandatory), media:media_files(storage_path, type))`)
          .eq('id', (payload.new as Execution).id).single()
        if (data) setExecutions(prev => [data as ExecWithDetails, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'execution_steps' }, (payload) => {
        const step = payload.new as { id: string; execution_id: string; status: string; completed_at: string | null }
        setExecutions(prev => prev.map(e => {
          if (e.id !== step.execution_id) return e
          return { ...e, steps: (e.steps ?? []).map(s => s.id === step.id ? { ...s, status: step.status as StepSummary['status'], completed_at: step.completed_at } : s) }
        }))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'execution_steps' }, (payload) => {
        const step = payload.new as { id: string; execution_id: string; status: string; completed_at: string | null }
        setExecutions(prev => prev.map(e => {
          if (e.id !== step.execution_id || e.steps?.some(s => s.id === step.id)) return e
          return { ...e, steps: [...(e.steps ?? []), { id: step.id, status: step.status as StepSummary['status'], completed_at: step.completed_at }] }
        }))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Callback de reenvio — reseta localmente
  function handleRequeue(execId: string) {
    setExecutions(prev => prev.map(e =>
      e.id === execId
        ? { ...e, status: 'in_progress', completed_at: null, steps: (e.steps ?? []).map(s => ({ ...s, status: 'pending' as const, completed_at: null })) }
        : e
    ))
  }

  // ── VISÃO DETALHE: colaborador selecionado ──────────────────────────────────
  if (selectedUser) {
    const userExecs = executions
      .filter(e => e.user?.id === selectedUser.id)
      .filter(e => filter === 'all' || e.status === filter)

    const totalSteps     = executions.filter(e => e.user?.id === selectedUser.id).reduce((acc, e) => acc + (e.steps?.length ?? 0), 0)
    const completedSteps = executions.filter(e => e.user?.id === selectedUser.id).reduce((acc, e) => acc + (e.steps?.filter(s => s.status === 'completed').length ?? 0), 0)

    return (
      <div>
        <SectionHeader
          eyebrow="Turno Ativo · Hoje"
          title="Execuções de POP"
          sub="Histórico completo de execuções e evidências do turno"
          action={<Btn variant="secondary" size="sm" onClick={() => exportToCSV(userExecs)}>⬇ Exportar CSV</Btn>}
        />

        {/* cabeçalho do colaborador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '16px 20px', background: 'white', borderRadius: 12, border: '1.5px solid #EDE0C8' }}>
          <button
            onClick={() => { setSelectedUser(null); setFilter('all') }}
            style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #EDE0C8', background: '#FDFAF5', color: '#B8864E', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            ←
          </button>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#B8864E', flexShrink: 0 }}>
            {initials(selectedUser.name)}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1C', marginBottom: 2 }}>{selectedUser.name}</p>
            <p style={{ fontSize: 11, color: '#9C8E80' }}>
              {executions.filter(e => e.user?.id === selectedUser.id).length} protocolos · {completedSteps}/{totalSteps} etapas concluídas
            </p>
          </div>
        </div>

        {/* filtro de status */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${filter === f.id ? '#B8864E' : '#EDE0C8'}`, background: filter === f.id ? '#B8864E' : 'white', color: filter === f.id ? 'white' : '#5C5248', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-lato)' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* cards de execução */}
        {userExecs.length === 0
          ? <EmptyState icon="◈" title="Nenhuma execução encontrada" sub="Tente ajustar o filtro de status" />
          : userExecs.map(e => <ExecutionCard key={e.id} e={e} onRequeue={handleRequeue} />)
        }
      </div>
    )
  }

  // ── VISÃO GERAL: cards por colaborador ──────────────────────────────────────
  return (
    <div>
      <SectionHeader
        eyebrow="Turno Ativo · Hoje"
        title="Execuções de POP"
        sub="Selecione um colaborador para ver os detalhes"
        action={<Btn variant="secondary" size="sm" onClick={() => exportToCSV(executions)}>⬇ Exportar CSV</Btn>}
      />

      {collaborators.length === 0 ? (
        <EmptyState icon="◈" title="Nenhuma execução hoje" sub="Aguarde o início das atividades do turno" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {collaborators.map(u => (
            <CollaboratorCard
              key={u.id}
              user={u}
              executions={executions.filter(e => e.user?.id === u.id)}
              onClick={() => setSelectedUser(u)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
