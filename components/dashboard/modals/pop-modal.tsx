'use client'

import { useState, useEffect, useRef } from 'react'
import { POP, UserRole, ShiftType, POPRoleAssignment } from '@/types'
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
  { value: 'operational',         label: 'Cuidador',              icon: '🤲' },
  { value: 'enfermeiro',          label: 'Enfermeiro(a)',          icon: '🩺' },
  { value: 'fisioterapeuta',      label: 'Fisioterapeuta',         icon: '🦴' },
  { value: 'psicologo',           label: 'Psicólogo(a)',           icon: '🧠' },
  { value: 'nutricionista',       label: 'Nutricionista',          icon: '🥗' },
  { value: 'cozinheiro',          label: 'Cozinheiro(a)',          icon: '👨‍🍳' },
  { value: 'limpeza',             label: 'Limpeza',                icon: '🧹' },
  { value: 'manutencao',          label: 'Manutenção',             icon: '🔧' },
  { value: 'terapia_ocupacional', label: 'Terapeuta Ocupacional',  icon: '🎨' },
  { value: 'estagiario',          label: 'Estagiário(a)',          icon: '📚' },
  { value: 'menor_aprendiz',      label: 'Menor Aprendiz',         icon: '🌱' },
  { value: 'marketing',           label: 'Marketing',              icon: '📣' },
  { value: 'resp_tecnica',        label: 'Resp. Técnica',          icon: '📋' },
  { value: 'musicoterapeuta',     label: 'Musicoterapeuta',        icon: '🎵' },
  { value: 'fonoaudiologa',       label: 'Fonoaudiólogo(a)',       icon: '🗣️' },
  { value: 'supervisor',          label: 'Supervisor',             icon: '👁️' },
  { value: 'admin',               label: 'Administrador',          icon: '⚙️' },
]

const SHIFT_OPTIONS: { value: ShiftType; label: string; icon: string }[] = [
  { value: 'morning', label: 'Matutino',   icon: '🌅' },
  { value: 'evening', label: 'Vespertino', icon: '🌇' },
  { value: 'night',   label: 'Noturno',    icon: '🌙' },
  { value: 'all',     label: 'Todos',      icon: '◎'  },
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

function ToggleGroup<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string; icon?: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          style={{
            padding: '8px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-lato)', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
            border: `1.5px solid ${value === opt.value ? '#B8864E' : '#EDE0C8'}`,
            background: value === opt.value ? '#B8864E' : 'white',
            color: value === opt.value ? 'white' : '#5C5248',
          }}>
          {opt.icon && <span>{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ label, checked, onChange, description }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; description?: string
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '10px 0' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11, flexShrink: 0, transition: 'all 0.2s',
          background: checked ? '#B8864E' : '#EDE0C8', position: 'relative', cursor: 'pointer',
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16,
          borderRadius: '50%', background: 'white', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1C' }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 2 }}>{description}</div>}
      </div>
    </label>
  )
}

type Tab = 'dados' | 'profissoes' | 'regras'

export function POPModal({ pop, onClose, onSaved, onDeleted }: Props) {
  const isEdit = !!pop
  const overlayRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<Tab>('dados')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Dados básicos ──────────────────────────────────────────────────────────
  const [form, setForm] = useState<CreatePOPDTO & {
    activation_window_minutes: number
    late_permission_minutes: number
    overlap_allowed: boolean
    odd_days_only: boolean
    requires_resident: boolean
  }>({
    name:                      pop?.name ?? '',
    role_type:                 pop?.role_type ?? 'operational',
    shift_type:                pop?.shift_type ?? 'morning',
    tolerance_minutes:         pop?.tolerance_minutes ?? 15,
    start_time_expected:       pop?.start_time_expected ?? undefined,
    deadline_time:             pop?.deadline_time ?? undefined,
    activation_window_minutes: pop?.activation_window_minutes ?? 15,
    late_permission_minutes:   pop?.late_permission_minutes ?? 10,
    overlap_allowed:           pop?.overlap_allowed ?? false,
    odd_days_only:             pop?.odd_days_only ?? false,
    requires_resident:         pop?.requires_resident ?? true,
  })

  const set = <K extends keyof typeof form>(field: K, value: typeof form[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  // ── Profissões múltiplas ───────────────────────────────────────────────────
  const initialRoles: POPRoleAssignment[] =
    pop?.assigned_roles && pop.assigned_roles.length > 0
      ? pop.assigned_roles
      : [{ role: pop?.role_type ?? 'operational', is_primary: true, enabled: true }]

  const [assignedRoles, setAssignedRoles] = useState<POPRoleAssignment[]>(initialRoles)

  const togglePOPRole = (role: UserRole) => {
    setAssignedRoles(prev => {
      const exists = prev.find(r => r.role === role)
      if (exists) {
        const next = prev.filter(r => r.role !== role)
        if (exists.is_primary && next.length > 0) next[0] = { ...next[0], is_primary: true }
        return next
      }
      return [...prev, { role, is_primary: prev.length === 0, enabled: true }]
    })
  }

  const setPrimaryRole = (role: UserRole) => {
    setAssignedRoles(prev => prev.map(r => ({ ...r, is_primary: r.role === role })))
    set('role_type', role)
  }

  const toggleRoleEnabled = (role: UserRole) => {
    setAssignedRoles(prev => prev.map(r => r.role === role ? { ...r, enabled: !r.enabled } : r))
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { setError('Nome do protocolo é obrigatório'); return }
    if (assignedRoles.length === 0) { setError('Vincule ao menos uma profissão'); return }

    setSaving(true)
    setError(null)
    try {
      const primaryRole = assignedRoles.find(r => r.is_primary)?.role ?? assignedRoles[0].role
      const payload = {
        ...form,
        role_type: primaryRole,
        start_time_expected: form.start_time_expected || undefined,
        deadline_time: form.deadline_time || undefined,
      }
      const saved = isEdit
        ? await popRepository.update(pop.id, payload)
        : await popRepository.create(payload)

      // Salva pop_role_assignments
      await popRepository.saveRoleAssignments(saved.id, assignedRoles)

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
    try {
      await popRepository.delete(pop.id)
      onDeleted(pop.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) e.preventDefault()
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dados',     label: 'Dados'      },
    { key: 'profissoes',label: 'Profissões' },
    { key: 'regras',    label: 'Regras'     },
  ]

  return (
    <div ref={overlayRef} onMouseDown={handleOverlayMouseDown}
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>

      <div style={{ background: 'white', borderRadius: 16, width: 580, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '24px 24px 0', borderBottom: '1px solid #F7F0E3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#B8864E', marginBottom: 4 }}>
                {isEdit ? 'Editar protocolo' : 'Novo protocolo'}
              </div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 700, color: '#1C1C1C', margin: 0 }}>
                {isEdit ? pop.name : 'Criar POP'}
              </h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9C8E80', padding: 4, lineHeight: 1 }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px',
                fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
                color: tab === t.key ? '#B8864E' : '#9C8E80',
                borderBottom: tab === t.key ? '2px solid #B8864E' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24, flex: 1 }}>

          {/* ── TAB: DADOS ── */}
          {tab === 'dados' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Nome do protocolo *">
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Ex: Banho de leito — Manhã" style={inputStyle} required />
              </Field>

              <Field label="Turno *">
                <ToggleGroup options={SHIFT_OPTIONS} value={form.shift_type} onChange={v => set('shift_type', v)} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <Field label="Hora início esperada">
                  <input type="time" value={form.start_time_expected ?? ''} style={inputStyle}
                    onChange={e => set('start_time_expected', e.target.value || undefined)} />
                </Field>
                <Field label="Prazo limite">
                  <input type="time" value={form.deadline_time ?? ''} style={inputStyle}
                    onChange={e => set('deadline_time', e.target.value || undefined)} />
                </Field>
                <Field label="Tolerância (min)">
                  <input type="number" min={0} max={480} value={form.tolerance_minutes} style={inputStyle}
                    onChange={e => set('tolerance_minutes', Number(e.target.value))} />
                </Field>
              </div>

              <Toggle
                label="Exige residente"
                description="Desative para tarefas gerais como manutenção ou limpeza de áreas comuns."
                checked={form.requires_resident}
                onChange={v => set('requires_resident', v)}
              />
            </div>
          )}

          {/* ── TAB: PROFISSÕES ── */}
          {tab === 'profissoes' && (
            <div>
              <div style={{ fontSize: 12, color: '#9C8E80', marginBottom: 12 }}>
                Selecione as profissões que podem executar este POP. Marque a <strong>principal</strong> para definir o role_type padrão.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {ROLE_OPTIONS.map(opt => {
                  const entry = assignedRoles.find(r => r.role === opt.value)
                  const checked = !!entry
                  const isPrimary = entry?.is_primary ?? false
                  const isEnabled = entry?.enabled ?? true
                  return (
                    <div key={opt.value} style={{
                      padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${checked ? '#B8864E' : '#EDE0C8'}`,
                      background: checked ? '#FFF8EE' : 'white',
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={checked} onChange={() => togglePOPRole(opt.value)}
                          style={{ accentColor: '#B8864E' }} />
                        <span style={{ fontSize: 14 }}>{opt.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: checked ? '#B8864E' : '#1C1C1C', flex: 1 }}>
                          {opt.label}
                        </span>
                      </label>
                      {checked && (
                        <div style={{ display: 'flex', gap: 12, marginTop: 8, paddingLeft: 22 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11 }}>
                            <input type="radio" name="pop_primary_role" checked={isPrimary}
                              onChange={() => setPrimaryRole(opt.value)} style={{ accentColor: '#B8864E' }} />
                            <span style={{ color: isPrimary ? '#B8864E' : '#9C8E80', fontWeight: isPrimary ? 700 : 400 }}>
                              Principal
                            </span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11 }}
                            onClick={e => { e.preventDefault(); toggleRoleEnabled(opt.value) }}>
                            <input type="checkbox" checked={isEnabled} readOnly style={{ accentColor: '#22C55E' }} />
                            <span style={{ color: isEnabled ? '#166534' : '#9C8E80' }}>
                              {isEnabled ? 'Ativo' : 'Desabilitado'}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── TAB: REGRAS ── */}
          {tab === 'regras' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
                <Field label="Janela de ativação (min)">
                  <input type="number" min={1} max={120} value={form.activation_window_minutes} style={inputStyle}
                    onChange={e => set('activation_window_minutes', Number(e.target.value))} />
                  <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 4 }}>
                    Minutos após o horário de início em que o POP pode ser iniciado livremente.
                  </div>
                </Field>
                <Field label="Tempo para pedir aprovação (min)">
                  <input type="number" min={1} max={120} value={form.late_permission_minutes} style={inputStyle}
                    onChange={e => set('late_permission_minutes', Number(e.target.value))} />
                  <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 4 }}>
                    Após este tempo sem início, o sistema solicita aprovação automática ao ADM.
                  </div>
                </Field>
              </div>

              <div style={{ borderTop: '1px solid #F7F0E3', paddingTop: 16 }}>
                <Toggle
                  label="Bloquear sobreposição de POPs"
                  description="O colaborador não poderá iniciar este POP se já tiver outro em andamento."
                  checked={!form.overlap_allowed}
                  onChange={v => set('overlap_allowed', !v)}
                />
                <Toggle
                  label="Apenas dias ímpares"
                  description="Em meses com 31 dias, colaboradores em escala ímpar trabalham 16 dias. Ative para respeitar esta regra."
                  checked={form.odd_days_only}
                  onChange={v => set('odd_days_only', v)}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #EF4444', borderRadius: 8, padding: '10px 14px', marginTop: 16, fontSize: 13, color: '#B91C1C' }}>
              {error}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            {isEdit && onDeleted && (
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
