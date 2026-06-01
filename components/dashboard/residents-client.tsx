'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Resident } from '@/types'
import { SectionHeader, Card, Badge, StatusBadge, ProgressBar, Avatar, Btn, EmptyState, Divider } from './ui'
import { ResidentModal } from './modals/resident-modal'

const DEP_LABELS: Record<string, string> = {
  independent: 'Independente',
  semi:        'Semi-dependente',
  dependent:   'Dependente',
  bedridden:   'Acamado',
}

const DEP_VARIANT: Record<string, { bg: string; color: string }> = {
  independent: { bg: '#F0FDF4', color: '#15803D' },
  semi:        { bg: '#EFF6FF', color: '#1D4ED8' },
  dependent:   { bg: '#FFF8EE', color: '#7a5c1a' },
  bedridden:   { bg: '#FEF2F2', color: '#B91C1C' },
}

function ResidentDetailModal({ resident, onClose, onEdit }: { resident: Resident; onClose: () => void; onEdit: (r: Resident) => void }) {
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
          <Avatar initials={initials} size={56} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 700, color: '#1C1C1C', margin: 0 }}>{resident.name}</h2>
            <div style={{ fontSize: 13, color: '#9C8E80', marginTop: 2 }}>
              Quarto {resident.room_number} · {resident.nickname ?? '—'}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <StatusBadge status="pending" />
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, background: dep.bg, color: dep.color }}>
                {DEP_LABELS[resident.dependency_level]}
              </span>
              {resident.is_bedridden && <Badge variant="danger">Acamado</Badge>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9C8E80', padding: 4 }}>✕</button>
        </div>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F7F0E3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#5C5248' }}>Progresso do turno</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#B8864E' }}>0%</span>
          </div>
          <ProgressBar value={0} status="pending" height={8} />
        </div>
        <div style={{ padding: '16px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9C8E80', marginBottom: 12 }}>Execuções — Turno Atual</div>
          <div style={{ fontSize: 13, color: '#9C8E80', padding: '12px 0' }}>Nenhuma execução registrada neste turno.</div>
        </div>
        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8 }}>
          <Btn variant="primary" size="md">Ver histórico completo</Btn>
          <Btn variant="secondary" size="md" onClick={() => onEdit(resident)}>Editar</Btn>
          <Btn variant="ghost" size="md">+ Intercorrência</Btn>
        </div>
      </div>
    </div>
  )
}

export function ResidentsClient({ residents: initialResidents }: { residents: Resident[] }) {
  const router = useRouter()
  const [residents, setResidents] = useState(initialResidents)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [selected, setSelected] = useState<Resident | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingResident, setEditingResident] = useState<Resident | undefined>(undefined)

  const openCreate = () => { setEditingResident(undefined); setShowModal(true) }
  const openEdit = (r: Resident) => { setEditingResident(r); setShowModal(true) }

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

  const filters = [
    { id: 'all',         label: 'Todos',      count: residents.length },
    { id: 'bedridden',   label: 'Acamados',   count: residents.filter(r => r.is_bedridden).length },
    { id: 'dependent',   label: 'Dependentes',count: residents.filter(r => r.dependency_level === 'dependent').length },
    { id: 'semi',        label: 'Semi-dep',   count: residents.filter(r => r.dependency_level === 'semi').length },
    { id: 'independent', label: 'Independentes', count: residents.filter(r => r.dependency_level === 'independent').length },
  ]

  const filtered = residents.filter(r => {
    const matchFilter = filter === 'all' || (filter === 'bedridden' ? r.is_bedridden : r.dependency_level === filter)
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.room_number.includes(search)
    return matchFilter && matchSearch
  })

  return (
    <div>
      <SectionHeader
        eyebrow={`Turno Atual · ${residents.length} residentes`}
        title="Residentes"
        sub="Acompanhe o progresso de cuidado de cada residente"
        action={<Btn variant="primary" size="sm" onClick={openCreate}>+ Cadastrar residente</Btn>}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9C8E80', fontSize: 14 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou quarto..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #EDE0C8', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-lato)', outline: 'none', background: 'white', color: '#1C1C1C' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{ padding: '7px 13px', borderRadius: 8, border: `1.5px solid ${filter === f.id ? '#B8864E' : '#EDE0C8'}`, background: filter === f.id ? '#B8864E' : 'white', color: filter === f.id ? 'white' : '#5C5248', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-lato)', display: 'flex', alignItems: 'center', gap: 5 }}
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

      {view === 'list' ? (
        <Card>
          {filtered.length === 0 ? (
            <EmptyState icon="◎" title="Nenhum residente encontrado" sub="Tente ajustar os filtros ou cadastre novos residentes" />
          ) : filtered.map((r, i) => {
            const initials = r.name.split(' ').map(w => w[0]).slice(0, 2).join('')
            return (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', cursor: 'pointer', borderBottom: i < filtered.length - 1 ? '1px solid #F7F0E3' : 'none' }}
              >
                <Avatar initials={initials} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 15, fontWeight: 700, color: '#1C1C1C' }}>{r.name}</span>
                    {r.is_bedridden && <Badge variant="danger">Acamado</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: '#9C8E80', marginTop: 1 }}>Quarto {r.room_number} · {DEP_LABELS[r.dependency_level]}</div>
                </div>
                <div style={{ width: 160 }}>
                  <ProgressBar value={0} status="pending" height={6} />
                  <div style={{ fontSize: 10, color: '#9C8E80', marginTop: 3 }}>0% concluído</div>
                </div>
                <StatusBadge status="pending" />
                <span style={{ color: '#D9C9A8', fontSize: 18 }}>›</span>
              </div>
            )
          })}
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {filtered.map(r => {
            const initials = r.name.split(' ').map(w => w[0]).slice(0, 2).join('')
            return (
              <Card key={r.id} onClick={() => setSelected(r)} style={{ padding: 20, cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <Avatar initials={initials} size={44} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-playfair)', fontSize: 14, fontWeight: 700, color: '#1C1C1C' }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: '#9C8E80' }}>Quarto {r.room_number}</div>
                  </div>
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
