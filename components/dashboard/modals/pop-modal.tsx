'use client'

import { useState } from 'react'
import { POP, UserRole, ShiftType } from '@/types'
import { popRepository, CreatePOPDTO } from '@/services/repositories/pop-repository'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Btn } from '../ui'

interface Props {
  pop?: POP
  onClose: () => void
  onSaved: (p: POP) => void
  onDeleted?: (id: string) => void
}

const ROLE_OPTIONS: { value: UserRole; label: string; icon: string }[] = [
  { value: 'operational',    label: 'Cuidador',         icon: '🤲' },
  { value: 'enfermeiro',     label: 'Enfermeiro(a)',     icon: '🩺' },
  { value: 'fisioterapeuta', label: 'Fisioterapeuta',    icon: '🦴' },
  { value: 'psicologo',      label: 'Psicólogo(a)',      icon: '🧠' },
  { value: 'nutricionista',  label: 'Nutricionista',     icon: '🥗' },
  { value: 'cozinheiro',     label: 'Cozinheiro(a)',     icon: '👨‍🍳' },
  { value: 'limpeza',        label: 'Limpeza',           icon: '🧹' },
  { value: 'supervisor',     label: 'Supervisor',        icon: '👁️' },
  { value: 'admin',          label: 'Administrador',     icon: '⚙️' },
]

const SHIFT_OPTIONS: { value: ShiftType; label: string; icon: string }[] = [
  { value: 'morning', label: 'Diurno',      icon: '🌅' },
  { value: 'evening', label: 'Vespertino',  icon: '🌇' },
  { value: 'night',   label: 'Noturno',     icon: '🌙' },
  { value: 'all',     label: 'Todos',       icon: '◎' },
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

function ToggleGroup<T extends string>({
  options, value, onChange, activeColor = '#B8864E',
}: {
  options: { value: T; label: string; icon?: string }[]
  value: T
  onChange: (v: T) => void
  activeColor?: string
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            padding: '8px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-lato)', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
            border: `1.5px solid ${value === opt.value ? activeColor : '#EDE0C8'}`,
            background: value === opt.value ? activeColor : 'white',
            color: value === opt.value ? 'white' : '#5C5248',
          }}
        >
          {opt.icon && <span>{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function POPModal({ pop, onClose, onSaved, onDeleted }: Props) {
  const isEdit = !!pop
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<CreatePOPDTO>({
    name:                pop?.name ?? '',
    role_type:           pop?.role_type ?? 'operational',
    shift_type:          pop?.shift_type ?? 'morning',
    tolerance_minutes:   pop?.tolerance_minutes ?? 15,
    start_time_expected: pop?.start_time_expected ?? undefined,
    deadline_time:       pop?.deadline_time ?? undefined,
  })

  const set = <K extends keyof CreatePOPDTO>(field: K, value: CreatePOPDTO[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) {
      setError('Nome do protocolo é obrigatório')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        start_time_expected: form.start_time_expected || undefined,
        deadline_time: form.deadline_time || undefined,
      }
      const saved = isEdit
        ? await popRepository.update(pop.id, payload)
        : await popRepository.create(payload)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!pop || !onDeleted) return
    setDeleting(true)
    setError(null)
    try {
      await popRepository.delete(pop.id)
      onDeleted(pop.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 16, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #F7F0E3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#B8864E', marginBottom: 4 }}>
              {isEdit ? 'Editar protocolo' : 'Novo protocolo'}
            </div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 700, color: '#1C1C1C', margin: 0 }}>
              {isEdit ? pop.name : 'Criar POP'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9C8E80', padding: 4 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <Field label="Nome do protocolo *" style={{ marginBottom: 16 }}>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: Banho de leito — Manhã"
              style={inputStyle}
              required
            />
          </Field>

          <Field label="Tipo de colaborador *" style={{ marginBottom: 16 }}>
            <ToggleGroup
              options={ROLE_OPTIONS}
              value={form.role_type}
              onChange={v => set('role_type', v)}
            />
          </Field>

          <Field label="Turno *" style={{ marginBottom: 16 }}>
            <ToggleGroup
              options={SHIFT_OPTIONS}
              value={form.shift_type}
              onChange={v => set('shift_type', v)}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Field label="Tolerância (min) *">
              <input
                type="number"
                min={0}
                max={480}
                value={form.tolerance_minutes}
                onChange={e => set('tolerance_minutes', Number(e.target.value))}
                style={inputStyle}
              />
            </Field>
            <Field label="Hora início esperada">
              <input
                type="time"
                value={form.start_time_expected ?? ''}
                onChange={e => set('start_time_expected', e.target.value || undefined)}
                style={inputStyle}
              />
            </Field>
            <Field label="Prazo limite">
              <input
                type="time"
                value={form.deadline_time ?? ''}
                onChange={e => set('deadline_time', e.target.value || undefined)}
                style={inputStyle}
              />
            </Field>
          </div>

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
              {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar protocolo'}
            </Btn>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir protocolo"
        message={`Tem certeza que deseja excluir "${pop?.name}"? Todos os blocos e passos vinculados serão removidos.`}
        confirmLabel="Excluir"
        onConfirm={() => { setConfirmDelete(false); handleDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
