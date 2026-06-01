'use client'

import { useState } from 'react'
import { POPBlock } from '@/types'
import { popRepository, CreateBlockDTO } from '@/services/repositories/pop-repository'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Btn } from '../ui'

interface Props {
  popId: string
  block?: POPBlock
  nextOrderIndex: number
  onClose: () => void
  onSaved: (b: POPBlock) => void
  onDeleted?: (id: string) => void
}

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

export function BlockModal({ popId, block, nextOrderIndex, onClose, onSaved, onDeleted }: Props) {
  const isEdit = !!block
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<Omit<CreateBlockDTO, 'pop_id'>>({
    name: block?.name ?? '',
    order_index: block?.order_index ?? nextOrderIndex,
    tolerance_minutes: block?.tolerance_minutes ?? 15,
  })

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome do bloco é obrigatório'); return }
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await popRepository.updateBlock(block.id, form)
        onSaved({ ...block, ...form })
      } else {
        const saved = await popRepository.createBlock({ pop_id: popId, ...form })
        onSaved(saved)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!block || !onDeleted) return
    setDeleting(true)
    try {
      await popRepository.deleteBlock(block.id)
      onDeleted(block.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 16, width: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #F7F0E3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#B8864E', marginBottom: 4 }}>Bloco</div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 700, color: '#1C1C1C', margin: 0 }}>
              {isEdit ? 'Editar bloco' : 'Novo bloco'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9C8E80' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <Field label="Nome do bloco *" style={{ marginBottom: 16 }}>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Higiene e cuidados" style={inputStyle} required />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <Field label="Posição">
              <input type="number" min={1} value={form.order_index} onChange={e => set('order_index', Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Tolerância (min)">
              <input type="number" min={0} max={480} value={form.tolerance_minutes} onChange={e => set('tolerance_minutes', Number(e.target.value))} style={inputStyle} />
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
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar bloco'}
            </Btn>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir bloco"
        message={`Excluir "${block?.name}"? Todos os passos vinculados serão removidos.`}
        confirmLabel="Excluir"
        onConfirm={() => { setConfirmDelete(false); handleDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
