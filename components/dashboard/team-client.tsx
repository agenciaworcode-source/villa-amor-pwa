'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserProfile } from '@/types'
import { SectionHeader, Card, Badge, Btn, Divider } from './ui'
import { UserModal, ROLE_LABELS } from './modals/invite-user-modal'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { userRepository } from '@/services/repositories/user-repository'

const ROLE_COLORS: Record<string, 'danger' | 'purple' | 'info' | 'gold'> = {
  admin:               'danger',
  supervisor:          'purple',
  operational:         'gold',
  enfermeiro:          'info',
  fisioterapeuta:      'info',
  psicologo:           'info',
  nutricionista:       'info',
  cozinheiro:          'info',
  limpeza:             'info',
  manutencao:          'info',
  terapia_ocupacional: 'info',
  estagiario:          'info',
  menor_aprendiz:      'info',
  marketing:           'info',
  resp_tecnica:        'purple',
  musicoterapeuta:     'info',
  fonoaudiologa:       'info',
  multiprofessional:   'info',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function TeamClient({ users: initialUsers }: { users: UserProfile[] }) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | undefined>(undefined)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null)

  const openCreate = () => { setEditingUser(undefined); setShowModal(true) }
  const openEdit = (user: UserProfile) => { setEditingUser(user); setShowModal(true) }

  const handleSaved = async () => {
    setShowModal(false)
    const fresh = await userRepository.findAll().catch(() => users)
    setUsers(fresh)
    router.refresh()
  }

  const handleDeactivate = async (id: string) => {
    setDeactivatingId(id)
    try {
      await userRepository.deactivate(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      router.refresh()
    } finally {
      setDeactivatingId(null)
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Gestão"
        title="Equipe"
        sub="Colaboradores ativos e seus acessos ao sistema"
        action={<Btn variant="primary" size="sm" onClick={openCreate}>+ Adicionar colaborador</Btn>}
      />

      {users.length === 0 ? (
        <Card>
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 700, color: '#1C1C1C', marginBottom: 6 }}>Nenhum colaborador cadastrado</div>
            <div style={{ fontSize: 13, color: '#9C8E80', marginBottom: 20 }}>Adicione a equipe para que possam acessar o sistema</div>
            <Btn variant="primary" size="md" onClick={openCreate}>+ Adicionar colaborador</Btn>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {users.map(member => {
            // Usa roles múltiplos se existir, senão fallback para role único
            const roleList = member.roles && member.roles.length > 0
              ? member.roles
              : [{ role: member.role, is_primary: true }]

            const primaryEntry = roleList.find(r => r.is_primary) ?? roleList[0]
            const secondaryRoles = roleList.filter(r => !r.is_primary)

            return (
              <Card key={member.id} style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#B8864E', flexShrink: 0 }}>
                    {initials(member.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1C', marginBottom: 2 }}>{member.name}</div>
                    <div style={{ fontSize: 11, color: '#9C8E80', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Badge variant={ROLE_COLORS[primaryEntry.role] ?? 'muted'}>
                        {ROLE_LABELS[primaryEntry.role] ?? primaryEntry.role}
                      </Badge>
                      {secondaryRoles.map(r => (
                        <Badge key={r.role} variant="muted" style={{ opacity: 0.75 }}>
                          {ROLE_LABELS[r.role] ?? r.role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', flexShrink: 0, marginTop: 6, boxShadow: '0 0 6px #22C55E' }} />
                </div>
                <Divider />
                <div style={{ paddingTop: 12, display: 'flex', gap: 6 }}>
                  <Btn variant="secondary" size="sm" onClick={() => openEdit(member)}>Editar</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setConfirmDeactivateId(member.id)} disabled={deactivatingId === member.id}>
                    {deactivatingId === member.id ? '...' : 'Desativar'}
                  </Btn>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {showModal && (
        <UserModal
          user={editingUser}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={!!confirmDeactivateId}
        title="Desativar colaborador"
        message={`Tem certeza que deseja desativar ${users.find(u => u.id === confirmDeactivateId)?.name}?`}
        confirmLabel="Desativar"
        variant="primary"
        onConfirm={() => { const id = confirmDeactivateId!; setConfirmDeactivateId(null); handleDeactivate(id) }}
        onCancel={() => setConfirmDeactivateId(null)}
      />
    </div>
  )
}
