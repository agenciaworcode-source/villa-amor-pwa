'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/utils/supabase/client'
import { Resident, Alert, ShiftType } from '@/types'
import { ShiftSummary } from '@/services/repositories/dashboard-repository'
import { AlertWithDetails } from '@/services/repositories/alert-repository'
import { KpiCard, SectionHeader, Card, Badge, StatusBadge, ProgressBar, Avatar, AlertBanner, Btn, Divider, EmptyState } from './ui'
import { useAuthStore } from '@/store/auth-store'
import { alertRepository } from '@/services/repositories/alert-repository'
import { AgendaItem } from '@/services/repositories/dashboard-repository'

// ---- Shift Timeline ----
const SHIFT_RANGES: Record<string, { startH: number; durationH: number; label: string; ticks: number[] }> = {
  morning: { startH: 7,  durationH: 6,  label: '07:00 — 13:00', ticks: [7, 9, 11, 13] },
  evening: { startH: 13, durationH: 6,  label: '13:00 — 19:00', ticks: [13, 15, 17, 19] },
  night:   { startH: 19, durationH: 12, label: '19:00 — 07:00', ticks: [19, 22, 1, 4, 7] },
  all:     { startH: 7,  durationH: 12, label: '07:00 — 19:00', ticks: [7, 10, 13, 16, 19] },
}

function ShiftTimeline({ shiftType }: { shiftType: ShiftType | null }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const cfg = SHIFT_RANGES[shiftType ?? 'all']
  const nowH = now.getHours() + now.getMinutes() / 60
  // For night shift: hours 0-7 are treated as 24-31
  const normalizedNow = (shiftType === 'night' && nowH < 12) ? nowH + 24 : nowH
  const elapsed = Math.max(0, normalizedNow - cfg.startH) * 60
  const pct = Math.max(0, Math.min(100, (elapsed / (cfg.durationH * 60)) * 100))

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9C8E80', marginBottom: 10 }}>
        Progresso do Turno ({cfg.label})
      </div>
      <div style={{ position: 'relative', height: 8, background: '#EDE0C8', borderRadius: 9999, marginBottom: 8 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #B8864E, #C9A96E)', borderRadius: 9999 }} />
        <div style={{ position: 'absolute', top: -3, width: 14, height: 14, borderRadius: '50%', background: '#B8864E', border: '2px solid white', boxShadow: '0 2px 6px rgba(184,134,78,0.4)', left: `calc(${pct}% - 7px)`, transition: 'left 1s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {cfg.ticks.map(h => (
          <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#9C8E80' }}>
            {String(h % 24).padStart(2, '0')}:00
          </span>
        ))}
      </div>
    </div>
  )
}

// ---- Resident Row ----
const PROGRESS_BY_STATUS: Record<string, number> = { completed: 100, in_progress: 50, late: 30, incomplete: 20, pending: 0 }
const BORDER_BY_STATUS: Record<string, string> = { completed: '#22C55E', in_progress: '#B8864E', late: '#EF4444', pending: '#D9C9A8' }

function ResidentRow({ resident, status }: { resident: Resident; status: string }) {
  const initials = resident.name.split(' ').map(w => w[0]).slice(0, 2).join('')
  const progress = PROGRESS_BY_STATUS[status] ?? 0
  const borderColor = BORDER_BY_STATUS[status] ?? '#D9C9A8'
  return (
    <Link
      href={`/dashboard/residents`}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #F7F0E3', borderLeft: `3px solid ${borderColor}`, textDecoration: 'none' }}
    >
      <Avatar initials={initials} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1C1C1C' }}>{resident.name}</span>
          {resident.is_bedridden && <Badge variant="danger">Acamado</Badge>}
        </div>
        <div style={{ fontSize: 11, color: '#9C8E80', marginBottom: 5 }}>
          Quarto {resident.room_number} · {resident.nickname ?? resident.name.split(' ')[0]}
        </div>
        <ProgressBar value={progress} status={status as 'pending' | 'in_progress' | 'completed' | 'late'} />
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <StatusBadge status={status} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#9C8E80', marginTop: 4 }}>{progress}%</div>
      </div>
    </Link>
  )
}

// ---- Alerts Panel ----
function AlertsPanel({ alerts, setAlerts, activeStaffCount, todayIncidentCount }: {
  alerts: AlertWithDetails[]
  setAlerts: React.Dispatch<React.SetStateAction<AlertWithDetails[]>>
  activeStaffCount: number
  todayIncidentCount: number
}) {
  const { user } = useAuthStore()

  const handleAck = async (id: string) => {
    if (!user) return
    await alertRepository.acknowledge(id, user.id).catch(() => null)
  }

  return (
    <div>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1C' }}>🔔 Alertas Ativos</div>
          <Badge variant="danger">{alerts.length}</Badge>
        </div>
        <div style={{ padding: '12px 12px 4px', maxHeight: 420, overflowY: 'auto' }}>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#9C8E80' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🛡️</div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nenhum alerta pendente</div>
            </div>
          ) : alerts.map(a => (
            <AlertBanner
              key={a.id}
              severity={a.severity as 'critical' | 'high' | 'medium' | 'low'}
              title={a.message}
              desc={`${a.resident?.name ?? ''} · ${new Date(a.triggered_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
              actions={
                <Btn variant="ghost" size="sm" onClick={() => handleAck(a.id)}>Ciente</Btn>
              }
            />
          ))}
        </div>
      </Card>

      {/* Resumo do Plantão */}
      <Card style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9C8E80', marginBottom: 12 }}>
          Resumo do Plantão
        </div>
        {[
          { label: 'Cuidadores ativos', value: String(activeStaffCount), ok: activeStaffCount > 0 },
          { label: 'Intercorrências hoje', value: todayIncidentCount > 0 ? String(todayIncidentCount) : 'Nenhuma', ok: todayIncidentCount === 0 },
          { label: 'Geofencing', value: '100m · Ativo', ok: true },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < 2 ? '1px solid #F7F0E3' : 'none' }}>
            <span style={{ fontSize: 12, color: '#5C5248' }}>{item.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: item.ok === true ? '#15803D' : item.ok === false ? '#B91C1C' : '#B8864E' }}>{item.value}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ---- Agenda Widget ----
const ROLE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  admin:             { bg: '#FEF2F2', color: '#B91C1C', label: 'Admin' },
  supervisor:        { bg: '#F0FDF4', color: '#15803D', label: 'Supervisor' },
  operational:       { bg: '#FFF8EE', color: '#B8864E', label: 'Cuidador' },
  enfermeiro:        { bg: '#EFF6FF', color: '#1D4ED8', label: 'Enfermeiro(a)' },
  fisioterapeuta:    { bg: '#F5F3FF', color: '#6D28D9', label: 'Fisioterapeuta' },
  psicologo:         { bg: '#FDF4FF', color: '#9333EA', label: 'Psicólogo(a)' },
  nutricionista:     { bg: '#F0FFF4', color: '#16A34A', label: 'Nutricionista' },
  cozinheiro:        { bg: '#FFF7ED', color: '#EA580C', label: 'Cozinheiro(a)' },
  limpeza:           { bg: '#F0F9FF', color: '#0284C7', label: 'Limpeza' },
  multiprofessional: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Multiprofissional' }, // legado
}

const SHIFT_LABEL: Record<string, string> = {
  morning: 'Diurno', evening: 'Vespertino', night: 'Noturno', all: 'Todos',
}

const EXEC_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  completed:   { label: 'Concluído',    color: '#15803D', bg: '#F0FDF4' },
  in_progress: { label: 'Em andamento', color: '#B8864E', bg: '#FFF8EE' },
  late:        { label: 'Atrasado',     color: '#B91C1C', bg: '#FEF2F2' },
  pending:     { label: 'Pendente',     color: '#9C8E80', bg: '#F7F0E3' },
}

function AgendaWidget({ items }: { items: AgendaItem[] }) {
  if (items.length === 0) {
    return (
      <Card style={{ padding: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9C8E80', marginBottom: 12 }}>
          📅 Agenda do Turno
        </div>
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#9C8E80', fontSize: 13 }}>
          Nenhum POP com horário definido cadastrado.
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1C' }}>📅 Agenda do Turno</div>
          <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 2 }}>POPs programados com rodízio de colaboradores</div>
        </div>
        <div style={{ fontSize: 11, color: '#9C8E80' }}>{items.length} protocolo{items.length !== 1 ? 's' : ''}</div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#FDFAF5', borderBottom: '1px solid #F7F0E3' }}>
              {['Horário', 'Protocolo', 'Turno / Perfil', 'Responsável Hoje', 'Residentes', 'Progresso'].map(col => (
                <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9C8E80', whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const role = ROLE_COLORS[item.roleType] ?? ROLE_COLORS.operational
              const pct = item.totalCount > 0 ? Math.round((item.completedCount / item.totalCount) * 100) : 0
              const lateCount = item.residents.filter(r => r.executionStatus === 'late').length
              return (
                <tr key={item.popId} style={{ borderBottom: idx < items.length - 1 ? '1px solid #F7F0E3' : 'none', background: idx % 2 === 0 ? 'white' : '#FDFAF5' }}>
                  {/* Horário */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: '#1C1C1C' }}>
                      {item.startTime ?? '—'}
                    </div>
                    {item.deadlineTime && (
                      <div style={{ fontSize: 10, color: '#9C8E80', marginTop: 2 }}>até {item.deadlineTime}</div>
                    )}
                  </td>
                  {/* Protocolo */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#1C1C1C' }}>{item.popName}</div>
                    {lateCount > 0 && (
                      <div style={{ fontSize: 10, color: '#B91C1C', fontWeight: 700, marginTop: 2 }}>⚠ {lateCount} atrasado{lateCount > 1 ? 's' : ''}</div>
                    )}
                  </td>
                  {/* Turno / Perfil */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 10, color: '#9C8E80' }}>{SHIFT_LABEL[item.shiftType] ?? item.shiftType}</div>
                    <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: role.bg, color: role.color }}>
                      {role.label}
                    </span>
                  </td>
                  {/* Responsável */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    {item.assignedUserName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#B8864E', flexShrink: 0 }}>
                          {item.assignedUserName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: '#1C1C1C', fontSize: 12 }}>{item.assignedUserName}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#9C8E80', fontStyle: 'italic' }}>Sem rodízio</span>
                    )}
                  </td>
                  {/* Residentes */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {item.residents.map(r => {
                        const st = r.executionStatus ? (EXEC_STATUS[r.executionStatus] ?? EXEC_STATUS.pending) : null
                        return (
                          <div key={r.residentId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#5C5248' }}>
                              {r.residentName} <span style={{ color: '#9C8E80' }}>Qto {r.roomNumber}</span>
                            </span>
                            {st && (
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 9999, background: st.bg, color: st.color }}>
                                {st.label}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </td>
                  {/* Progresso */}
                  <td style={{ padding: '14px 16px', minWidth: 100 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? '#15803D' : lateCount > 0 ? '#B91C1C' : '#B8864E', marginBottom: 4 }}>
                      {item.completedCount}/{item.totalCount} ({pct}%)
                    </div>
                    <div style={{ height: 6, background: '#EDE0C8', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22C55E' : lateCount > 0 ? '#EF4444' : '#B8864E', borderRadius: 9999, transition: 'width 0.5s' }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ---- Main Component ----
interface Props {
  summary: ShiftSummary
  alerts: AlertWithDetails[]
  residents: Resident[]
  conformidade: number
  residentStatus: Record<string, string>
  activeShiftType: ShiftType | null
  activeStaffCount: number
  todayIncidentCount: number
  agendaItems: AgendaItem[]
}

const STATUS_RANK: Record<string, number> = { completed: 4, in_progress: 3, late: 2, incomplete: 1, pending: 0 }

export function DashboardClient({
  summary,
  alerts: initialAlerts,
  residents,
  conformidade: initialConformidade,
  residentStatus,
  activeShiftType,
  activeStaffCount,
  todayIncidentCount: initialTodayIncidentCount,
  agendaItems,
}: Props) {
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })

  // ---- Live state ----
  const [liveAlerts, setLiveAlerts] = useState<AlertWithDetails[]>(initialAlerts)
  const [residentStatusMap, setResidentStatusMap] = useState<Record<string, string>>(residentStatus)
  const [liveCompletedCount, setLiveCompletedCount] = useState(summary.completed_executions)
  const [liveLateCount, setLiveLateCount] = useState(
    Object.values(residentStatus).filter(s => s === 'late').length
  )
  const [liveTodayIncidentCount, setLiveTodayIncidentCount] = useState(initialTodayIncidentCount)

  // Recalculate derived KPIs whenever residentStatusMap changes
  useEffect(() => {
    const values = Object.values(residentStatusMap)
    setLiveCompletedCount(values.filter(s => s === 'completed').length)
    setLiveLateCount(values.filter(s => s === 'late').length)
  }, [residentStatusMap])

  // ---- Subscriptions: executions + incidents + alerts (canal único) ----
  useEffect(() => {
    const handleExecChange = (payload: { new: { resident_id: string; status: string } }) => {
      const { resident_id, status } = payload.new
      setResidentStatusMap(prev => {
        const cur = prev[resident_id]
        if (!cur || (STATUS_RANK[status] ?? 0) > (STATUS_RANK[cur] ?? 0)) {
          return { ...prev, [resident_id]: status }
        }
        return prev
      })
    }

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'executions' }, handleExecChange)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'executions' }, handleExecChange)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, () => {
        setLiveTodayIncidentCount(prev => prev + 1)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, async (payload) => {
        const { data } = await supabase
          .from('alerts')
          .select('*, resident:residents(*)')
          .eq('id', payload.new.id)
          .single()
        if (data) setLiveAlerts(prev => [data as AlertWithDetails, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts' }, (payload) => {
        if (payload.new.acknowledged_at) {
          setLiveAlerts(prev => prev.filter(a => a.id !== payload.new.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ---- Derived KPIs ----
  const liveConformidade = residents.length > 0
    ? Math.round((liveCompletedCount / residents.length) * 100)
    : 0

  return (
    <div>
      <SectionHeader
        eyebrow={`Turno Ativo · ${today}`}
        title="Dashboard"
        sub="Visão em tempo real das execuções e alertas do turno"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" size="sm">⬇ Exportar</Btn>
            <Link href="/dashboard/incidents">
              <Btn variant="primary" size="sm">+ Intercorrência</Btn>
            </Link>
          </div>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiCard label="Residentes no turno" value={summary.total_residents} sub={`${liveCompletedCount} concluídos`} icon="◎" />
        <KpiCard label="Concluídos" value={liveCompletedCount} sub={`de ${summary.total_residents} residentes`} icon="✓" accent />
        <KpiCard label="Alertas ativos" value={liveAlerts.length} sub={`${summary.total_residents - liveCompletedCount} execuções pendentes`} icon="⚠" />
        <KpiCard label="Conformidade" value={`${liveConformidade}%`} sub="Meta: 90% até fim do turno" icon="◈" accent />
      </div>

      {/* Grid principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Lista de Residentes + Timeline */}
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1C' }}>Residentes — Progresso do Turno</div>
              <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 1 }}>Acompanhamento em tempo real</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Badge variant="success" dot>Concluídos: {liveCompletedCount}</Badge>
              <Badge variant="danger" dot>Atrasados: {liveLateCount}</Badge>
            </div>
          </div>

          <ShiftTimeline shiftType={activeShiftType} />
          <Divider />

          {residents.length === 0 ? (
            <EmptyState icon="◎" title="Nenhum residente cadastrado" sub="Cadastre residentes para acompanhar o turno" />
          ) : (
            residents.map(r => (
              <ResidentRow key={r.id} resident={r} status={residentStatusMap[r.id] ?? 'pending'} />
            ))
          )}
        </Card>

        {/* Painel de Alertas + Resumo */}
        <AlertsPanel
          alerts={liveAlerts}
          setAlerts={setLiveAlerts}
          activeStaffCount={activeStaffCount}
          todayIncidentCount={liveTodayIncidentCount}
        />
      </div>

      {/* Agenda */}
      <div style={{ marginTop: 20 }}>
        <AgendaWidget items={agendaItems} />
      </div>
    </div>
  )
}
