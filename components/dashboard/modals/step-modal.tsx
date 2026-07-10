'use client'

import { useState } from 'react'
import { POPStep, StepType } from '@/types'
import { popRepository, CreateStepDTO } from '@/services/repositories/pop-repository'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Btn } from '../ui'

interface Props {
  blockId: string
  step?: POPStep
  nextOrderIndex: number
  onClose: () => void
  onSaved: (s: POPStep) => void
  onDeleted?: (id: string) => void
}

const STEP_TYPES: { value: StepType; label: string; icon: string; desc: string }[] = [
  { value: 'photo',    label: 'Foto',         icon: '📸', desc: 'Captura obrigatória de foto' },
  { value: 'video',    label: 'Vídeo',        icon: '🎥', desc: 'Gravação obrigatória de vídeo (máx 10s)' },
  { value: 'checkbox', label: 'Confirmação',  icon: '✅', desc: 'Colaborador confirma que realizou a ação' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #EDE0C8', borderRadius: 8,
  fontSize: 14, fontFamily: 'var(--font-lato)', outline: 'none', color: '#1C1C1C',
  background: 'white', boxSizing: 'border-box',
}

function Field({ label, children, style = {} }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9C8E80', marginBottom: 6 }}>{label}</label>}
      {children}
    </div>
  )
}

export function StepModal({ blockId, step, nextOrderIndex, onClose, onSaved, onDeleted }: Props) {
  const isEdit = !!step
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<Omit<CreateStepDTO, 'block_id'>>({
    order_index: step?.order_index ?? nextOrderIndex,
    title: step?.title ?? '',
    description: step?.description ?? '',
    type: step?.type ?? 'checkbox',
    is_mandatory: step?.is_mandatory ?? true,
  })

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Título do passo é obrigatório'); return }
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await popRepository.updateStep(step.id, form)
        onSaved({ ...step, ...form })
      } else {
        const saved = await popRepository.createStep({ block_id: blockId, ...form })
        onSaved(saved)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!step || !onDeleted) return
    setDeleting(true)
    try {
      await popRepository.deleteStep(step.id)
      onDeleted(step.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 16, width: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #F7F0E3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#B8864E', marginBottom: 4 }}>Passo</div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 700, color: '#1C1C1C', margin: 0 }}>
              {isEdit ? 'Editar passo' : 'Novo passo'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9C8E80' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <Field label="Título do passo *" style={{ marginBottom: 16 }}>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Verificar pressão arterial" style={inputStyle} required />
          </Field>

          <Field label="Descrição / instrução" style={{ marginBottom: 16 }}>
            <textarea
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              placeholder="Orientação adicional para o colaborador..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </Field>

          <Field label="Tipo de evidência *" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STEP_TYPES.map(opt => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${form.type === opt.value ? '#B8864E' : '#EDE0C8'}`,
                    background: form.type === opt.value ? '#FFF8EE' : 'white', transition: 'all 0.15s',
                  }}
                >
                  <input type="radio" name="step-type" value={opt.value} checked={form.type === opt.value} onChange={() => set('type', opt.value)} style={{ accentColor: '#B8864E' }} />
                  <span style={{ fontSize: 18 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: form.type === opt.value ? '#B8864E' : '#1C1C1C' }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: '#9C8E80' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <Field label="Posição">
              <input type="number" min={1} value={form.order_index} onChange={e => set('order_index', Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 22 }}>
                <input type="checkbox" checked={form.is_mandatory} onChange={e => set('is_mandatory', e.target.checked)} style={{ width: 18, height: 18, accentColor: '#B8864E', cursor: 'pointer' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1C' }}>Obrigatório</span>
              </label>
            </Field>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #EF4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#B91C1C' }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            {isEdit && onDeleted && (
              <Btn variant="danger" size="md" type="button" onClick={() => setConfirmDelete(true)} disabled={saving || deleting} style={{ marginRight: 'auto' }}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </Btn>
            )}
            <Btn variant="ghost" size="md" type="button" onClick={onClose} disabled={saving || deleting}>Cancelar</Btn>
            <Btn variant="primary" size="md" disabled={saving || deleting}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar passo'}
            </Btn>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir passo"
        message={`Excluir o passo "${step?.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={() => { setConfirmDelete(false); handleDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
