'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Resident } from '@/types'
import { SectionHeader, Card, Badge, StatusBadge, ProgressBar, Avatar, Btn, EmptyState } from './ui'
import { ResidentModal } from './modals/resident-modal'

// ── Labels ────────────────────────────────────────────────────────────────────

export const DEP_LABELS: Record<string, string> = {
  independent: 'Independente',
  g1:          'G1 — Grau 1',
  g2:          'G2 — Grau 2',
  g3:          'G3 — Grau 3',
  bedridden:   'Acamado',
  semi:        'G2 (legado)',
  dependent:   'G3 (legado)',
}

const DEP_VARIANT: Record<string, { bg: string; color: string }> = {
  independent: { bg: '#F0FDF4', color: '#15803D' },
  g1:          { bg: '#EFF6FF', color: '#1D4ED8' },
  g2:          { bg: '#FFF8EE', color: '#B45309' },
  g3:          { bg: '#FEF2F2', color: '#B91C1C' },
  bedridden:   { bg: '#F5F3FF', color: '#7C3AED' },
  semi:        { bg: '#FFF8EE', color: '#B45309' },
  dependent:   { bg: '#FEF2F2', color: '#B91C1C' },
}

const STAY_LABELS: Record<string, string> = {
  moradia:   'Moradia',
  day_care:  'Day Care',
  temporada: 'Temporada',
}

// ── Export CSV ────────────────────────────────────────────────────────────────

function exportCSV(residents: Resident[]) {
  const headers = [
    'Nome', 'Apelido', 'Quarto', 'Grau', 'Modalidade', 'Valor mensal',
    'Dia pgto', 'Entrada', 'Saída', 'Motivo saída', 'Pré-cadastro',
    'CPF', 'Responsável', 'Telefone resp.', 'Email resp.', 'Ativo',
  ]
  const rows = residents.map(r => [
    r.name,
    r.nickname ?? '',
    r.room_number,
    DEP_LABELS[r.dependency_level] ?? r.dependency_level,
    r.stay_type ? (STAY_LABELS[r.stay_type] ?? r.stay_type) : '',
    r.monthly_value ?? '',
    r.payment_day ?? '',
    r.entry_date ?? '',
    r.exit_date ?? '',
    r.exit_reason ?? '',
    r.is_prospect ? 'Sim' : 'Não',
    r.cpf ?? '',
    r.responsible_name ?? '',
    r.responsible_phone ?? '',
    r.responsible_email ?? '',
    r.active ? 'Sim' : 'Não',
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `residentes_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Modal de detalhe simplificado ────────────────────────────────────────────

function ResidentDetailModal({ resident, onClose, onEdit }: {
  resident: Resident; onClose: () => void; onEdit: (r: Resident) => void
}) {
  const initials = resident.name.split(' ').map(w => w[0]).slice(0, 2).join('')
  const dep = DEP_VARIANT[resident.dependency_level] ?? DEP_VARIANT.independent
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 16, width: 540, maxHeight: '82vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid #F7F0E3', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {resident.photo_url ? (
            <img src={resident.photo_url} alt="foto" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <Avatar initials={initials} size={56} />
          )}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 700, color: '#1C1C1C', margin: 0 }}>{resident.name}</h2>
            <div style={{ fontSize: 13, color: '#9C8E80', marginTop: 2 }}>
              Quarto {resident.room_number}
              {resident.stay_type && ` · ${STAY_LABELS[resident.stay_type] ?? resident.stay_type}`}
              {resident.nickname && ` · ${resident.nickname}`}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {resident.is_prospect && (
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: '#EFF6FF', color: '#1D4ED8' }}>PRÉ-CADASTRO</span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, background: dep.bg, color: dep.color }}>
                {DEP_LABELS[resident.dependency_level]}
              </span>
              {resident.is_bedridden && <Badge variant="danger">Acamado</Badge>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9C8E80', padding: 4 }}>✕</button>
        </div>

        {/* Info rápida */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F7F0E3', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: 13 }}>
          {resident.entry_date  && <InfoRow label="Entrada"  value={new Date(resident.entry_date + 'T12:00:00').toLocaleDateString('pt-BR')} />}
          {resident.exit_date   && <InfoRow label="Saída"    value={new Date(resident.exit_date + 'T12:00:00').toLocaleDateString('pt-BR')} />}
          {resident.payment_day && <InfoRow label="Dia pgto" value={`Dia ${resident.payment_day}`} />}
          {resident.monthly_value && <InfoRow label="Mensalidade" value={Number(resident.monthly_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />}
          {resident.responsible_name  && <InfoRow label="Responsável" value={resident.responsible_name} />}
          {resident.responsible_phone && <InfoRow label="Telefone"    value={resident.responsible_phone} />}
        </div>

        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F7F0E3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#5C5248' }}>Progresso do turno</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#B8864E' }}>0%</span>
          </div>
          <ProgressBar value={0} status="pending" height={8} />
        </div>

        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8, marginTop: 16 }}>
          <Btn variant="primary" size="md">Ver histórico completo</Btn>
          <Btn variant="secondary" size="md" onClick={() => onEdit(resident)}>Editar</Btn>
          <Btn variant="ghost" size="md">+ Intercorrência</Btn>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9C8E80', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1C1C1C', fontWeight: 600 }}>{value}</div>
    </div>
  )
}

// ── Lista principal ───────────────────────────────────────────────────────────

type FilterId = 'all' | 'prospect' | 'g1' | 'g2' | 'g3' | 'bedridden' | 'independent' | 'day_care' | 'temporada'

export function ResidentsClient({ residents: initialResidents }: { residents: Resident[] }) {
  const router = useRouter()
  const [residents, setResidents] = useState(initialResidents)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<FilterId>('all')
  const [view, setView]           = useState<'list' | 'grid'>('list')
  const [selected, setSelected]   = useState<Resident | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingResident, setEditingResident] = useState<Resident | undefined>(undefined)
  const [refreshing, setRefreshing] = useState(false)

  const openCreate = () => { setEditingResident(undefined); setShowModal(true) }
  const openEdit   = (r: Resident) => { setEditingResident(r); setShowModal(true) }

  const handleSaved = (saved: Resident) => {
    setResidents(prev => {
      const exists = prev.find(r => r.id === saved.id)
      return exists ? prev.map(r => r.id === saved.id ? saved : r) : [saved, ...prev]
    })
    setShowModal(false)
    router.refresh()
  }

  const handleDeleted = (id: string) => {
    setResidents(prev => prev.filter(r => r.id !== id))
    setShowModal(false)
    router.refresh()
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 800)
  }

  const filters: { id: FilterId; label: string; count: number }[] = useMemo(() => [
    { id: 'all',         label: 'Todos',          count: residents.length },
    { id: 'prospect',    label: 'Prospecção',      count: residents.filter(r => r.is_prospect).length },
    { id: 'independent', label: 'Independente',    count: residents.filter(r => r.dependency_level === 'independent').length },
    { id: 'g1',          label: 'G1',              count: residents.filter(r => r.dependency_level === 'g1').length },
    { id: 'g2',          label: 'G2',              count: residents.filter(r => ['g2','semi'].includes(r.dependency_level)).length },
    { id: 'g3',          label: 'G3',              count: residents.filter(r => ['g3','dependent'].includes(r.dependency_level)).length },
    { id: 'bedridden',   label: 'Acamado',         count: residents.filter(r => r.is_bedridden).length },
    { id: 'day_care',    label: 'Day Care',         count: residents.filter(r => r.stay_type === 'day_care').length },
    { id: 'temporada',   label: 'Temporada',        count: residents.filter(r => r.stay_type === 'temporada').length },
  ], [residents])

  const filtered = useMemo(() => {
    return residents.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.room_number.includes(search)
      let matchFilter = true
      if (filter === 'prospect')    matchFilter = r.is_prospect
      else if (filter === 'bedridden') matchFilter = r.is_bedridden
      else if (filter === 'g2')     matchFilter = ['g2','semi'].includes(r.dependency_level)
      else if (filter === 'g3')     matchFilter = ['g3','dependent'].includes(r.dependency_level)
      else if (filter === 'day_care' || filter === 'temporada') matchFilter = r.stay_type === filter
      else if (filter !== 'all')    matchFilter = r.dependency_level === filter
      return matchFilter && matchSearch
    })
  }, [residents, search, filter])

  return (
    <div>
      <SectionHeader
        eyebrow={`${residents.filter(r => !r.is_prospect).length} residentes · ${residents.filter(r => r.is_prospect).length} prospecções`}
        title="Residentes"
        sub="Gerencie o cadastro e o cuidado de cada residente"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? '⟳' : '↻'} Atualizar
            </Btn>
            <Btn variant="secondary" size="sm" onClick={() => exportCSV(residents)}>
              ↓ Exportar
            </Btn>
            <Btn variant="primary" size="sm" onClick={openCreate}>+ Cadastrar residente</Btn>
          </div>
        }
      />

      {/* Barra de busca e filtros */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9C8E80', fontSize: 14 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou quarto..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #EDE0C8', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-lato)', outline: 'none', background: 'white', color: '#1C1C1C' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filters.filter(f => f.count > 0 || f.id === 'all').map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{ padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${filter === f.id ? '#B8864E' : '#EDE0C8'}`, background: filter === f.id ? '#B8864E' : 'white', color: filter === f.id ? 'white' : '#5C5248', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-lato)', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {f.label}
              <span style={{ background: filter === f.id ? 'rgba(255,255,255,0.25)' : '#F7F0E3', borderRadius: 9999, padding: '0 6px', fontSize: 10, color: filter === f.id ? 'white' : '#9C8E80' }}>{f.count}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['list', 'grid'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '7px 11px', borderRadius: 8, border: `1.5px solid ${view === v ? '#B8864E' : '#EDE0C8'}`, background: view === v ? '#FFF8EE' : 'white', cursor: 'pointer', fontSize: 14, color: view === v ? '#B8864E' : '#9C8E80' }}>
              {v === 'list' ? '☰' : '⊞'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {view === 'list' ? (
        <Card>
          {filtered.length === 0 ? (
            <EmptyState icon="◎" title="Nenhum residente encontrado" sub="Tente ajustar os filtros ou cadastre novos residentes" />
          ) : filtered.map((r, i) => {
            const initials = r.name.split(' ').map(w => w[0]).slice(0, 2).join('')
            const dep = DEP_VARIANT[r.dependency_level] ?? DEP_VARIANT.independent
            return (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', cursor: 'pointer', borderBottom: i < filtered.length - 1 ? '1px solid #F7F0E3' : 'none', background: r.is_prospect ? '#FAFCFF' : 'white' }}
              >
                {r.photo_url ? (
                  <img src={r.photo_url} alt="foto" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <Avatar initials={initials} size={44} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 15, fontWeight: 700, color: '#1C1C1C' }}>{r.name}</span>
                    {r.is_prospect && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#EFF6FF', color: '#1D4ED8' }}>PRÉ-CADASTRO</span>}
                    {r.is_bedridden && <Badge variant="danger">Acamado</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: '#9C8E80', marginTop: 1 }}>
                    Quarto {r.room_number}
                    {r.stay_type && ` · ${STAY_LABELS[r.stay_type] ?? r.stay_type}`}
                  </div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, background: dep.bg, color: dep.color, whiteSpace: 'nowrap' }}>
                  {DEP_LABELS[r.dependency_level]}
                </span>
                <div style={{ width: 120 }}>
                  <ProgressBar value={0} status="pending" height={6} />
                  <div style={{ fontSize: 10, color: '#9C8E80', marginTop: 3 }}>0% concluído</div>
                </div>
                <span style={{ color: '#D9C9A8', fontSize: 18 }}>›</span>
              </div>
            )
          })}
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {filtered.map(r => {
            const initials = r.name.split(' ').map(w => w[0]).slice(0, 2).join('')
            const dep = DEP_VARIANT[r.dependency_level] ?? DEP_VARIANT.independent
            return (
              <Card key={r.id} onClick={() => setSelected(r)} style={{ padding: 20, cursor: 'pointer', background: r.is_prospect ? '#FAFCFF' : 'white' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
                  {r.photo_url ? (
                    <img src={r.photo_url} alt="foto" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <Avatar initials={initials} size={44} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-playfair)', fontSize: 14, fontWeight: 700, color: '#1C1C1C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: '#9C8E80' }}>Quarto {r.room_number}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  {r.is_prospect && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#EFF6FF', color: '#1D4ED8' }}>PRÉ-CADASTRO</span>}
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: dep.bg, color: dep.color }}>{DEP_LABELS[r.dependency_level]}</span>
                </div>
                <ProgressBar value={0} status="pending" height={6} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: '#9C8E80' }}>0%</span>
                  <StatusBadge status="pending" />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {selected && <ResidentDetailModal resident={selected} onClose={() => setSelected(null)} onEdit={r => { setSelected(null); openEdit(r) }} />}
      {showModal && (
        <ResidentModal
          resident={editingResident}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
