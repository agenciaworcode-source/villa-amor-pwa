'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { POP } from '@/types'
import { SectionHeader, Card, Badge, Btn, Divider, EmptyState } from './ui'
import { POPModal } from './modals/pop-modal'
import { popRepository } from '@/services/repositories/pop-repository'

const SHIFT_LABELS: Record<string, string> = {
  morning: 'Diurno', evening: 'Vespertino', night: 'Noturno', all: 'Todos',
}

const ROLE_ICONS: Record<string, string> = {
  admin:             '⚙️',
  supervisor:        '👁️',
  operational:       '🤲',
  enfermeiro:        '🩺',
  fisioterapeuta:    '🦴',
  psicologo:         '🧠',
  nutricionista:     '🥗',
  cozinheiro:        '👨‍🍳',
  limpeza:           '🧹',
  multiprofessional: '🩺', // legado
}

const ROLE_LABELS: Record<string, string> = {
  admin:             'Administrador',
  supervisor:        'Supervisor',
  operational:       'Cuidador',
  enfermeiro:        'Enfermeiro(a)',
  fisioterapeuta:    'Fisioterapeuta',
  psicologo:         'Psicólogo(a)',
  nutricionista:     'Nutricionista',
  cozinheiro:        'Cozinheiro(a)',
  limpeza:           'Limpeza',
  multiprofessional: 'Multiprofissional',
}

export function POPsClient({ pops: initialPOPs }: { pops: POP[] }) {
  const router = useRouter()
  const [pops, setPOPs] = useState(initialPOPs)
  const [showModal, setShowModal] = useState(false)
  const [editingPOP, setEditingPOP] = useState<POP | undefined>(undefined)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const openCreate = () => { setEditingPOP(undefined); setShowModal(true) }
  const openEdit = (pop: POP) => { setEditingPOP(pop); setShowModal(true) }

  const handleSaved = (saved: POP) => {
    setPOPs(prev => {
      const exists = prev.find(p => p.id === saved.id)
      return exists ? prev.map(p => p.id === saved.id ? saved : p) : [saved, ...prev]
    })
    setShowModal(false)
    router.refresh()
  }

  const handleDeleted = (id: string) => {
    setPOPs(prev => prev.filter(p => p.id !== id))
    setShowModal(false)
    router.refresh()
  }

  const handleToggle = async (pop: POP) => {
    setTogglingId(pop.id)
    try {
      await popRepository.toggleActive(pop.id, !pop.active)
      setPOPs(prev => prev.map(p => p.id === pop.id ? { ...p, active: !p.active } : p))
      router.refresh()
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Motor de POPs"
        title="Protocolos Operacionais"
        sub="POPs ativos e templates de execução"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="primary" size="sm" onClick={openCreate}>+ Novo POP</Btn>
          </div>
        }
      />

      {pops.length === 0 ? (
        <Card>
          <EmptyState icon="☰" title="Nenhum protocolo cadastrado" sub="Crie protocolos operacionais para os colaboradores seguirem" />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {pops.map(pop => (
            <Card key={pop.id} style={{ padding: 20, opacity: pop.active ? 1 : 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: '#F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {ROLE_ICONS[pop.role_type] ?? '📋'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1C', marginBottom: 4 }}>{pop.name}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <Badge variant={pop.active ? 'success' : 'muted'} dot>{pop.active ? 'Ativo' : 'Inativo'}</Badge>
                    <Badge variant="muted">v{pop.version}</Badge>
                    <Badge variant="gold">{SHIFT_LABELS[pop.shift_type] ?? pop.shift_type}</Badge>
                    <Badge variant="info">{ROLE_ICONS[pop.role_type] ?? '📋'} {ROLE_LABELS[pop.role_type] ?? pop.role_type}</Badge>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9C8E80' }}>Tolerância</div>
                  <div style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 700, color: '#B8864E' }}>{pop.tolerance_minutes}m</div>
                </div>
                {pop.start_time_expected && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9C8E80' }}>Início esperado</div>
                    <div style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 700, color: '#5C5248' }}>{pop.start_time_expected}</div>
                  </div>
                )}
              </div>
              <Divider />
              <div style={{ paddingTop: 12, display: 'flex', gap: 6 }}>
                <Btn variant="primary" size="sm" onClick={() => router.push(`/dashboard/pops/${pop.id}`)}>Gerenciar</Btn>
                <Btn variant="secondary" size="sm" onClick={() => openEdit(pop)}>Editar</Btn>
                <Btn
                  variant={pop.active ? 'ghost' : 'success'}
                  size="sm"
                  onClick={() => handleToggle(pop)}
                  disabled={togglingId === pop.id}
                >
                  {pop.active ? 'Desativar' : 'Ativar'}
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <POPModal
          pop={editingPOP}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
