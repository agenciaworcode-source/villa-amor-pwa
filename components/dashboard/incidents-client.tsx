'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Resident } from '@/types'
import { SectionHeader, Card, Btn, EmptyState } from './ui'
import { Incident, IncidentStatus, incidentRepository } from '@/services/repositories/incident-repository'
import { useAuthStore } from '@/store/auth-store'
import { IncidentModal } from './modals/incident-modal'

const TYPE_ICONS: Record<string, string> = {
  fall:             '🤕',
  infection:        '🦠',
  pressure_injury:  '🩹',
  hospitalization:  '🏥',
  death:            '🕊️',
  other:            '📋',
}

const TYPE_BORDER: Record<string, string> = {
  fall:             '#EF4444',
  infection:        '#F59E0B',
  pressure_injury:  '#8B5CF6',
  hospitalization:  '#3B82F6',
  death:            '#1C1C1C',
  other:            '#B8864E',
}

const STATUS_LABELS: Record<string, string> = {
  open:       'Aberto',
  monitoring: 'Em observação',
  resolved:   'Resolvido',
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  open:       { bg: '#FEF2F2', color: '#B91C1C' },
  monitoring: { bg: '#FFF8EE', color: '#7a5c1a' },
  resolved:   { bg: '#F0FDF4', color: '#15803D' },
}

export function IncidentsClient({ incidents: initialIncidents, residents }: { incidents: Incident[]; residents: Resident[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const { user } = useAuthStore()
  const [list, setList] = useState(initialIncidents)
  const [showModal, setShowModal] = useState(false)
  const [editingIncident, setEditingIncident] = useState<Incident | undefined>(undefined)

  const openCreate = () => { setEditingIncident(undefined); setShowModal(true) }
  const openEdit = (incident: Incident) => { setEditingIncident(incident); setShowModal(true) }

  const counts = {
    all:        list.length,
    open:       list.filter(i => i.status === 'open').length,
    monitoring: list.filter(i => i.status === 'monitoring').length,
    resolved:   list.filter(i => i.status === 'resolved').length,
  }

  const filtered = filter === 'all' ? list : list.filter(i => i.status === filter)

  const handleUpdateStatus = async (id: string, status: IncidentStatus) => {
    await incidentRepository.updateStatus(id, status)
    setList(prev => prev.map(i =>
      i.id === id
        ? { ...i, status, ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}) }
        : i
    ))
  }

  const handleSaved = (incident: Incident) => {
    setList(prev => {
      const exists = prev.find(i => i.id === incident.id)
      return exists
        ? prev.map(i => i.id === incident.id ? incident : i)
        : [incident, ...prev]
    })
    setShowModal(false)
    router.refresh()
  }

  const handleDeleted = (id: string) => {
    setList(prev => prev.filter(i => i.id !== id))
    setShowModal(false)
    router.refresh()
  }

  const filters = [
    { id: 'all',        label: 'Todos',         count: counts.all },
    { id: 'open',       label: 'Abertos',       count: counts.open },
    { id: 'monitoring', label: 'Em observação', count: counts.monitoring },
    { id: 'resolved',   label: 'Resolvidos',    count: counts.resolved },
  ]

  return (
    <div>
      <SectionHeader
        eyebrow="Operacional"
        title="Intercorrências"
        sub="Registro e acompanhamento de eventos adversos"
        action={<Btn variant="danger" size="sm" onClick={openCreate}>+ Registrar intercorrência</Btn>}
      />

      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-lato)',
              border: `1.5px solid ${filter === f.id ? '#B8864E' : '#EDE0C8'}`,
              background: filter === f.id ? '#B8864E' : 'white',
              color: filter === f.id ? 'white' : '#5C5248',
              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {f.label}
            <span style={{ background: filter === f.id ? 'rgba(255,255,255,0.25)' : '#F7F0E3', borderRadius: 9999, padding: '0 6px', fontSize: 10, color: filter === f.id ? 'white' : '#9C8E80' }}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="🛡️"
            title="Nenhuma intercorrência"
            sub={filter === 'all' ? 'Registre intercorrências para acompanhar o histórico' : 'Nenhuma intercorrência com este status'}
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(incident => {
            const borderColor = TYPE_BORDER[incident.type] ?? '#D9C9A8'
            const statusStyle = STATUS_STYLE[incident.status] ?? STATUS_STYLE.open
            const isExpanded = expanded === incident.id
            return (
              <Card key={incident.id} style={{ overflow: 'hidden', borderLeft: `4px solid ${borderColor}` }}>
                <div style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : incident.id)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_ICONS[incident.type] ?? '📋'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1C' }}>
                          {incident.description.length > 80 ? `${incident.description.slice(0, 80)}…` : incident.description}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: statusStyle.bg, color: statusStyle.color }}>
                          {STATUS_LABELS[incident.status]}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#9C8E80' }}>
                        {incident.resident?.name && (
                          <span style={{ fontWeight: 600, color: '#5C5248' }}>{incident.resident.name} · </span>
                        )}
                        {new Date(incident.occurred_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </div>
                    </div>
                    <span style={{ color: '#D9C9A8', fontSize: 16, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>›</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 18px 16px 52px', borderTop: '1px solid #F7F0E3' }}>
                    <p style={{ fontSize: 13, color: '#5C5248', lineHeight: 1.6, marginBottom: 12, paddingTop: 12 }}>
                      {incident.description}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {incident.status !== 'resolved' && (
                        <Btn variant="success" size="sm" onClick={() => handleUpdateStatus(incident.id, 'resolved')}>
                          Marcar resolvido
                        </Btn>
                      )}
                      {incident.status === 'open' && (
                        <Btn variant="secondary" size="sm" onClick={() => handleUpdateStatus(incident.id, 'monitoring')}>
                          Em observação
                        </Btn>
                      )}
                      <Btn variant="ghost" size="sm" onClick={() => openEdit(incident)}>Editar</Btn>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {showModal && residents.length > 0 && (
        <IncidentModal
          incident={editingIncident}
          residents={residents}
          reportedBy={user?.id}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {showModal && residents.length === 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 360, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, color: '#1C1C1C', marginBottom: 8 }}>Sem residentes cadastrados</h3>
            <p style={{ fontSize: 13, color: '#9C8E80', marginBottom: 20 }}>Cadastre pelo menos um residente antes de registrar uma intercorrência.</p>
            <Btn variant="primary" size="md" onClick={() => setShowModal(false)}>Fechar</Btn>
          </div>
        </div>
      )}
    </div>
  )
}
