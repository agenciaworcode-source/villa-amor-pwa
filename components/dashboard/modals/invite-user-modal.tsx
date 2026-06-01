'use client'

import { useState } from 'react'
import { UserProfile, UserRole } from '@/types'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Btn } from '../ui'

interface Props {
  user?: UserProfile
  onClose: () => void
  onSaved: () => void
}

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin',          label: 'Administrador',   description: 'Acesso total ao sistema' },
  { value: 'supervisor',     label: 'Supervisor',      description: 'Acompanha execuções e equipe' },
  { value: 'operational',    label: 'Cuidador',        description: 'Cuidadores e técnicos de enfermagem' },
  { value: 'enfermeiro',     label: 'Enfermeiro(a)',   description: 'Executa protocolos de enfermagem' },
  { value: 'fisioterapeuta', label: 'Fisioterapeuta',  description: 'Sessões e protocolos de fisioterapia' },
  { value: 'psicologo',      label: 'Psicólogo(a)',    description: 'Atendimentos e avaliações psicológicas' },
  { value: 'nutricionista',  label: 'Nutricionista',   description: 'Protocolos de nutrição e dieta' },
  { value: 'cozinheiro',     label: 'Cozinheiro(a)',   description: 'Preparo de refeições e dietas' },
  { value: 'limpeza',        label: 'Limpeza',         description: 'Higienização de quartos e áreas comuns' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #EDE0C8', borderRadius: 8,
  fontSize: 14, fontFamily: 'var(--font-lato)', outline: 'none', color: '#1C1C1C', background: 'white',
  boxSizing: 'border-box',
}

function Field({ label, children, style = {} }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9C8E80', marginBottom: 6 }}>{label}</label>}
      {children}
    </div>
  )
}

export function UserModal({ user, onClose, onSaved }: Props) {
  const isEdit = !!user
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    name:     user?.name ?? '',
    email:    user?.email ?? '',
    role:     (user?.role as UserRole) ?? 'operational',
    password: '',
  })

  const set = (field: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || (!isEdit && !form.password)) {
      setError('Nome e email são obrigatórios')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/users', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: user.id, name: form.name, role: form.role } : form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar colaborador')
      setSuccess(true)
      setTimeout(() => {
        onSaved()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
        <div style={{ background: 'white', borderRadius: 16, width: 400, padding: 40, textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 700, color: '#1C1C1C', marginBottom: 8 }}>
            {isEdit ? 'Alterações salvas!' : 'Colaborador criado!'}
          </h3>
          <p style={{ fontSize: 13, color: '#9C8E80' }}>{form.name} foi {isEdit ? 'atualizado' : 'adicionado'} com sucesso.</p>
        </div>
      </div>
    )
  }

  const handleDelete = async () => {
    if (!user) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao excluir colaborador')
      setSuccess(true)
      setTimeout(() => {
        onSaved()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 16, width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #F7F0E3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#B8864E', marginBottom: 4 }}>
               {isEdit ? 'Editar colaborador' : 'Novo colaborador'}
            </div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 700, color: '#1C1C1C', margin: 0 }}>
              {isEdit ? user.name : 'Adicionar colaborador'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9C8E80', padding: 4 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Field label="Nome completo *">
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Carlos Silva" style={inputStyle} required />
            </Field>
            <Field label="E-mail *">
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="carlos@villaamor.com.br" style={inputStyle} required disabled={isEdit} />
            </Field>
          </div>

          <Field label="Função *" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ROLE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${form.role === opt.value ? '#B8864E' : '#EDE0C8'}`,
                    background: form.role === opt.value ? '#FFF8EE' : 'white',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={form.role === opt.value}
                    onChange={() => set('role', opt.value)}
                    style={{ accentColor: '#B8864E' }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: form.role === opt.value ? '#B8864E' : '#1C1C1C' }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: '#9C8E80' }}>{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </Field>

           {!isEdit && (
            <Field label="Senha de acesso *" style={{ marginBottom: 24 }}>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" style={inputStyle} required />
              <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 5 }}>O colaborador poderá alterar a senha depois do primeiro acesso.</div>
            </Field>
          )}

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #EF4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#B91C1C' }}>
              {error}
            </div>
          )}

           <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            {isEdit && (
              <Btn variant="danger" size="md" type="button" onClick={() => setConfirmDelete(true)} disabled={saving || deleting} style={{ marginRight: 'auto' }}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </Btn>
            )}
            <Btn variant="ghost" size="md" type="button" onClick={onClose} disabled={saving || deleting}>Cancelar</Btn>
            <Btn variant="primary" size="md" disabled={saving || deleting}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Adicionar colaborador'}
            </Btn>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir colaborador"
        message={`Tem certeza que deseja excluir definitivamente ${user?.name}? Esta ação removerá o acesso e todos os dados vinculados.`}
        confirmLabel="Excluir"
        onConfirm={() => { setConfirmDelete(false); handleDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
