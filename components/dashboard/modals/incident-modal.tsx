'use client'

import { useState } from 'react'
import { Resident } from '@/types'
import { incidentRepository, CreateIncidentDTO, IncidentType, Incident } from '@/services/repositories/incident-repository'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Btn } from '../ui'

interface Props {
  incident?: Incident
  residents: Resident[]
  reportedBy?: string
  onClose: () => void
  onSaved: (i: Incident) => void
  onDeleted?: (id: string) => void
}

const TYPE_OPTIONS: { value: IncidentType; label: string; icon: string }[] = [
  { value: 'fall',             label: 'Queda',           icon: '🤕' },
  { value: 'infection',        label: 'Infecção',        icon: '🦠' },
  { value: 'pressure_injury',  label: 'Lesão por pressão', icon: '🩹' },
  { value: 'hospitalization',  label: 'Internação',      icon: '🏥' },
  { value: 'death',            label: 'Óbito',           icon: '🕊️' },
  { value: 'other',            label: 'Outro',           icon: '📋' },
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

export function IncidentModal({ incident, residents, reportedBy, onClose, onSaved, onDeleted }: Props) {
  const isEdit = !!incident
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  const [form, setForm] = useState<CreateIncidentDTO>({
    resident_id:  incident?.resident_id ?? residents[0]?.id ?? '',
    reported_by:  incident?.reported_by ?? reportedBy,
    type:         incident?.type ?? 'fall',
    description:  incident?.description ?? '',
    occurred_at:  incident?.occurred_at ? new Date(incident.occurred_at).toISOString().slice(0, 16) : localISO,
  })

  const set = <K extends keyof CreateIncidentDTO>(field: K, value: CreateIncidentDTO[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.resident_id || !form.description) {
      setError('Selecione o residente e descreva a intercorrência')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = isEdit
        ? await incidentRepository.update(incident.id, form)
        : await incidentRepository.create(form)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!incident || !onDeleted) return
    setDeleting(true)
    setError(null)
    try {
      await incidentRepository.delete(incident.id)
      onDeleted(incident.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 16, width: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #F7F0E3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#EF4444', marginBottom: 4 }}>
              Operacional
            </div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 700, color: '#1C1C1C', margin: 0 }}>
              {isEdit ? 'Editar Intercorrência' : 'Registrar Intercorrência'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9C8E80', padding: 4 }}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>

          <Field label="Residente *" style={{ marginBottom: 16 }}>
            <select
              value={form.resident_id}
              onChange={e => set('resident_id', e.target.value)}
              style={{ ...inputStyle }}
            >
              {residents.map(r => (
                <option key={r.id} value={r.id}>{r.name} — Quarto {r.room_number}</option>
              ))}
            </select>
          </Field>

          <Field label="Tipo de intercorrência *" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('type', opt.value)}
                  style={{
                    padding: '8px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-lato)', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                    border: `1.5px solid ${form.type === opt.value ? '#EF4444' : '#EDE0C8'}`,
                    background: form.type === opt.value ? '#EF4444' : 'white',
                    color: form.type === opt.value ? 'white' : '#5C5248',
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Data e hora *" style={{ marginBottom: 16 }}>
            <input
              type="datetime-local"
              value={form.occurred_at}
              onChange={e => set('occurred_at', e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Descrição *" style={{ marginBottom: 24 }}>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Descreva em detalhes o que aconteceu..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </Field>

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
            <Btn variant={isEdit ? 'primary' : 'danger'} size="md" disabled={saving || deleting}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Registrar intercorrência'}
            </Btn>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir intercorrência"
        message="Tem certeza que deseja excluir esta intercorrência? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => { setConfirmDelete(false); handleDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
