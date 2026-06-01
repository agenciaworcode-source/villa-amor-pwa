'use client'

import { useState } from 'react'
import { Resident, DependencyLevel } from '@/types'
import { residentRepository, CreateResidentDTO } from '@/services/repositories/resident-repository'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Btn } from '../ui'

interface Props {
  resident?: Resident
  onClose: () => void
  onSaved: (r: Resident) => void
  onDeleted?: (id: string) => void
}

const DEP_OPTIONS: { value: DependencyLevel; label: string }[] = [
  { value: 'independent', label: 'Independente' },
  { value: 'semi',        label: 'Semi-dependente' },
  { value: 'dependent',   label: 'Dependente' },
  { value: 'bedridden',   label: 'Acamado' },
]

const RELATIONSHIP_OPTIONS = [
  'Filho(a)', 'Cônjuge', 'Irmão(ã)', 'Neto(a)', 'Sobrinho(a)',
  'Pai / Mãe', 'Amigo(a)', 'Outro',
]

const TABS = [
  { id: 'identificacao', label: 'Identificação' },
  { id: 'responsavel',   label: 'Responsável' },
  { id: 'saude',         label: 'Saúde' },
  { id: 'observacoes',   label: 'Observações' },
] as const

type TabId = typeof TABS[number]['id']

function maskCPF(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14)
}
function maskPhone(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15)
}

export function ResidentModal({ resident, onClose, onSaved, onDeleted }: Props) {
  const isEdit = !!resident
  const [tab, setTab]               = useState<TabId>('identificacao')
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const [form, setForm] = useState<CreateResidentDTO>({
    // Identificação
    name:               resident?.name ?? '',
    nickname:           resident?.nickname ?? '',
    birth_date:         resident?.birth_date ?? '',
    nationality:        resident?.nationality ?? 'Brasileira',
    naturalness:        resident?.naturalness ?? '',
    // Documentos
    cpf:                resident?.cpf ?? '',
    rg:                 resident?.rg ?? '',
    rg_issuer:          resident?.rg_issuer ?? '',
    rg_issue_date:      resident?.rg_issue_date ?? '',
    // Alojamento
    room_number:        resident?.room_number ?? '',
    admission_date:     resident?.admission_date ?? '',
    contract_number:    resident?.contract_number ?? '',
    // Cuidado
    dependency_level:   resident?.dependency_level ?? 'independent',
    is_bedridden:       resident?.is_bedridden ?? false,
    // Responsável
    responsible_name:         resident?.responsible_name ?? '',
    responsible_relationship: resident?.responsible_relationship ?? '',
    responsible_cpf:          resident?.responsible_cpf ?? '',
    responsible_phone:        resident?.responsible_phone ?? '',
    responsible_email:        resident?.responsible_email ?? '',
    responsible_address:      resident?.responsible_address ?? '',
    // Saúde
    doctor_name:           resident?.doctor_name ?? '',
    doctor_crm:            resident?.doctor_crm ?? '',
    health_insurance:      resident?.health_insurance ?? '',
    health_insurance_number: resident?.health_insurance_number ?? '',
    diagnoses:             resident?.diagnoses ?? '',
    allergies:             resident?.allergies ?? '',
    medications:           resident?.medications ?? '',
    // Outros
    notes:                 resident?.notes ?? '',
  })

  const set = (field: keyof CreateResidentDTO, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.room_number.trim()) {
      setError('Nome completo e quarto são obrigatórios.')
      setTab('identificacao')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = isEdit
        ? await residentRepository.update(resident.id, form)
        : await residentRepository.create(form)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!resident || !onDeleted) return
    setDeleting(true)
    try {
      await residentRepository.deactivate(resident.id)
      onDeleted(resident.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desativar')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 16, width: 640, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '22px 24px 0', borderBottom: '1px solid #F7F0E3', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#B8864E', marginBottom: 4 }}>
                {isEdit ? 'Editar residente' : 'Novo residente'}
              </div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 700, color: '#1C1C1C', margin: 0 }}>
                {isEdit ? resident.name : 'Cadastrar residente'}
              </h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9C8E80', padding: 4, marginTop: -2 }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--font-lato)', border: 'none', background: 'none',
                  borderBottom: `2px solid ${tab === t.id ? '#B8864E' : 'transparent'}`,
                  color: tab === t.id ? '#B8864E' : '#9C8E80',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: 24 }}>

            {/* ── IDENTIFICAÇÃO ── */}
            {tab === 'identificacao' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <SectionTitle>Dados Pessoais</SectionTitle>
                <Row>
                  <Field label="Nome completo *">
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Maria José Oliveira" required style={inputStyle} />
                  </Field>
                  <Field label="Apelido / Nome social">
                    <input value={form.nickname ?? ''} onChange={e => set('nickname', e.target.value)} placeholder="Ex: Dona Maria" style={inputStyle} />
                  </Field>
                </Row>
                <Row>
                  <Field label="Data de nascimento">
                    <input type="date" value={form.birth_date ?? ''} onChange={e => set('birth_date', e.target.value)} style={inputStyle} />
                  </Field>
                  <Field label="Nacionalidade">
                    <input value={form.nationality ?? ''} onChange={e => set('nationality', e.target.value)} placeholder="Brasileira" style={inputStyle} />
                  </Field>
                  <Field label="Naturalidade">
                    <input value={form.naturalness ?? ''} onChange={e => set('naturalness', e.target.value)} placeholder="Ex: São Paulo/SP" style={inputStyle} />
                  </Field>
                </Row>

                <SectionTitle>Documentos</SectionTitle>
                <Row>
                  <Field label="CPF">
                    <input
                      value={form.cpf ?? ''}
                      onChange={e => set('cpf', maskCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="RG">
                    <input value={form.rg ?? ''} onChange={e => set('rg', e.target.value)} placeholder="Ex: 12.345.678-9" style={inputStyle} />
                  </Field>
                </Row>
                <Row>
                  <Field label="Órgão emissor do RG">
                    <input value={form.rg_issuer ?? ''} onChange={e => set('rg_issuer', e.target.value)} placeholder="Ex: SSP/SP" style={inputStyle} />
                  </Field>
                  <Field label="Data de emissão do RG">
                    <input type="date" value={form.rg_issue_date ?? ''} onChange={e => set('rg_issue_date', e.target.value)} style={inputStyle} />
                  </Field>
                </Row>

                <SectionTitle>Alojamento e Admissão</SectionTitle>
                <Row>
                  <Field label="Número do quarto *">
                    <input value={form.room_number} onChange={e => set('room_number', e.target.value)} placeholder="Ex: 101" required style={inputStyle} />
                  </Field>
                  <Field label="Data de admissão">
                    <input type="date" value={form.admission_date ?? ''} onChange={e => set('admission_date', e.target.value)} style={inputStyle} />
                  </Field>
                  <Field label="Número do contrato">
                    <input value={form.contract_number ?? ''} onChange={e => set('contract_number', e.target.value)} placeholder="Ex: CT-2024-001" style={inputStyle} />
                  </Field>
                </Row>

                <SectionTitle>Nível de Dependência</SectionTitle>
                <Field label="Classificação *">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {DEP_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set('dependency_level', opt.value)}
                        style={{
                          padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-lato)',
                          border: `1.5px solid ${form.dependency_level === opt.value ? '#B8864E' : '#EDE0C8'}`,
                          background: form.dependency_level === opt.value ? '#B8864E' : 'white',
                          color: form.dependency_level === opt.value ? 'white' : '#5C5248',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_bedridden}
                    onChange={e => set('is_bedridden', e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#B8864E', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 14, color: '#1C1C1C', fontWeight: 600 }}>Residente acamado</span>
                </label>
              </div>
            )}

            {/* ── RESPONSÁVEL ── */}
            {tab === 'responsavel' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <SectionTitle>Responsável Legal / Contato de Emergência</SectionTitle>
                <Row>
                  <Field label="Nome completo do responsável" style={{ flex: 2 }}>
                    <input value={form.responsible_name ?? ''} onChange={e => set('responsible_name', e.target.value)} placeholder="Ex: João Carlos Oliveira" style={inputStyle} />
                  </Field>
                  <Field label="Grau de parentesco">
                    <select value={form.responsible_relationship ?? ''} onChange={e => set('responsible_relationship', e.target.value)} style={inputStyle}>
                      <option value="">Selecione...</option>
                      {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                </Row>
                <Row>
                  <Field label="CPF do responsável">
                    <input
                      value={form.responsible_cpf ?? ''}
                      onChange={e => set('responsible_cpf', maskCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Telefone / WhatsApp">
                    <input
                      value={form.responsible_phone ?? ''}
                      onChange={e => set('responsible_phone', maskPhone(e.target.value))}
                      placeholder="(14) 99999-0000"
                      maxLength={15}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="E-mail">
                    <input type="email" value={form.responsible_email ?? ''} onChange={e => set('responsible_email', e.target.value)} placeholder="email@exemplo.com" style={inputStyle} />
                  </Field>
                </Row>
                <Field label="Endereço do responsável">
                  <input value={form.responsible_address ?? ''} onChange={e => set('responsible_address', e.target.value)} placeholder="Rua, número, bairro, cidade/UF" style={inputStyle} />
                </Field>
              </div>
            )}

            {/* ── SAÚDE ── */}
            {tab === 'saude' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <SectionTitle>Médico Responsável</SectionTitle>
                <Row>
                  <Field label="Nome do médico">
                    <input value={form.doctor_name ?? ''} onChange={e => set('doctor_name', e.target.value)} placeholder="Dr(a). Nome Sobrenome" style={inputStyle} />
                  </Field>
                  <Field label="CRM">
                    <input value={form.doctor_crm ?? ''} onChange={e => set('doctor_crm', e.target.value)} placeholder="Ex: CRM/SP 123456" style={inputStyle} />
                  </Field>
                </Row>

                <SectionTitle>Plano de Saúde</SectionTitle>
                <Row>
                  <Field label="Operadora">
                    <input value={form.health_insurance ?? ''} onChange={e => set('health_insurance', e.target.value)} placeholder="Ex: Unimed, Bradesco Saúde" style={inputStyle} />
                  </Field>
                  <Field label="Número da carteirinha">
                    <input value={form.health_insurance_number ?? ''} onChange={e => set('health_insurance_number', e.target.value)} placeholder="Ex: 00000000000000" style={inputStyle} />
                  </Field>
                </Row>

                <SectionTitle>Histórico Clínico</SectionTitle>
                <Field label="Diagnósticos / CIDs">
                  <textarea
                    value={form.diagnoses ?? ''}
                    onChange={e => set('diagnoses', e.target.value)}
                    placeholder="Ex: Alzheimer (F00), Hipertensão Arterial (I10), Diabetes tipo 2 (E11)..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </Field>
                <Field label="Alergias">
                  <textarea
                    value={form.allergies ?? ''}
                    onChange={e => set('allergies', e.target.value)}
                    placeholder="Ex: Dipirona, Penicilina, látex..."
                    rows={2}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </Field>
                <Field label="Medicamentos em uso">
                  <textarea
                    value={form.medications ?? ''}
                    onChange={e => set('medications', e.target.value)}
                    placeholder="Ex: Losartana 50mg (1x dia), Metformina 850mg (2x dia), Donepezila 5mg (noite)..."
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </Field>
              </div>
            )}

            {/* ── OBSERVAÇÕES ── */}
            {tab === 'observacoes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <SectionTitle>Observações Gerais</SectionTitle>
                <Field label="Observações e informações adicionais">
                  <textarea
                    value={form.notes ?? ''}
                    onChange={e => set('notes', e.target.value)}
                    placeholder="Preferências alimentares, rotinas importantes, aspectos comportamentais, histórico relevante..."
                    rows={8}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </Field>
                <div style={{ background: '#F7F0E3', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#9C8E80', lineHeight: 1.6 }}>
                  <strong style={{ color: '#5C5248' }}>Dica:</strong> Use este campo para registrar preferências de alimentação, rotinas do residente, aspectos comportamentais, histórico relevante ou qualquer informação que auxilie a equipe no dia a dia.
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #F7F0E3', display: 'flex', alignItems: 'center', gap: 10, background: '#FDFAF5', borderRadius: '0 0 16px 16px', flexShrink: 0 }}>
            {isEdit && onDeleted && (
              <Btn variant="danger" size="md" type="button" onClick={() => setConfirmDelete(true)} disabled={saving || deleting} style={{ marginRight: 'auto' }}>
                {deleting ? 'Desativando...' : 'Excluir'}
              </Btn>
            )}

            {/* Nav entre abas */}
            <div style={{ display: 'flex', gap: 6, marginRight: 'auto' }}>
              {TABS.map((t, i) => (
                <div
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
                    background: tab === t.id ? '#B8864E' : '#EDE0C8',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>

            {error && (
              <div style={{ fontSize: 12, color: '#B91C1C', flex: 1, textAlign: 'right' }}>{error}</div>
            )}

            <Btn variant="ghost" size="md" type="button" onClick={onClose} disabled={saving || deleting}>Cancelar</Btn>
            <Btn variant="primary" size="md" disabled={saving || deleting}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar residente'}
            </Btn>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Desativar residente"
        message={`Tem certeza que deseja desativar o cadastro de ${resident?.name}? Ele não aparecerá mais nas listas ativas, mas seu histórico será preservado.`}
        confirmLabel="Desativar"
        onConfirm={() => { setConfirmDelete(false); handleDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

// ── Helpers de layout ──────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#B8864E', paddingBottom: 8, borderBottom: '1px solid #F7F0E3', marginBottom: 4 }}>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 14 }}>{children}</div>
}

function Field({ label, children, style = {} }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ flex: 1, ...style }}>
      {label && (
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9C8E80', marginBottom: 6 }}>
          {label}
        </label>
      )}
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #EDE0C8', borderRadius: 8,
  fontSize: 14, fontFamily: 'var(--font-lato)', outline: 'none', color: '#1C1C1C',
  background: 'white', boxSizing: 'border-box',
}
