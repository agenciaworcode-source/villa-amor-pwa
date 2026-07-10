'use client'

import { useState, useEffect, useRef } from 'react'
import { UserProfile, UserRole, UserRoleEntry, UserDocument, EmployeeType } from '@/types'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Btn } from '../ui'

// ─── Labels ───────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  admin:               'Administrador',
  supervisor:          'Supervisor',
  operational:         'Cuidador',
  enfermeiro:          'Enfermeiro(a)',
  fisioterapeuta:      'Fisioterapeuta',
  psicologo:           'Psicólogo(a)',
  nutricionista:       'Nutricionista',
  cozinheiro:          'Cozinheiro(a)',
  limpeza:             'Limpeza',
  manutencao:          'Manutenção',
  terapia_ocupacional: 'Terapeuta Ocupacional',
  estagiario:          'Estagiário(a)',
  menor_aprendiz:      'Menor Aprendiz',
  marketing:           'Marketing',
  resp_tecnica:        'Responsável Técnica',
  musicoterapeuta:     'Musicoterapeuta',
  fonoaudiologa:       'Fonoaudiólogo(a)',
  multiprofessional:   'Multiprofissional',
}

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin',               label: 'Administrador',        description: 'Acesso total ao sistema' },
  { value: 'supervisor',          label: 'Supervisor',           description: 'Acompanha execuções e equipe' },
  { value: 'operational',         label: 'Cuidador',             description: 'Cuidados e técnicos de enfermagem' },
  { value: 'enfermeiro',          label: 'Enfermeiro(a)',        description: 'Protocolos de enfermagem' },
  { value: 'fisioterapeuta',      label: 'Fisioterapeuta',       description: 'Sessões e protocolos de fisioterapia' },
  { value: 'psicologo',           label: 'Psicólogo(a)',         description: 'Atendimentos e avaliações psicológicas' },
  { value: 'nutricionista',       label: 'Nutricionista',        description: 'Protocolos de nutrição e dieta' },
  { value: 'cozinheiro',          label: 'Cozinheiro(a)',        description: 'Preparo de refeições e dietas' },
  { value: 'limpeza',             label: 'Limpeza',              description: 'Higienização de quartos e áreas comuns' },
  { value: 'manutencao',          label: 'Manutenção',           description: 'Manutenção predial e equipamentos' },
  { value: 'terapia_ocupacional', label: 'Terapeuta Ocupacional',description: 'Terapia ocupacional e reabilitação' },
  { value: 'estagiario',          label: 'Estagiário(a)',        description: 'Estagiário em formação' },
  { value: 'menor_aprendiz',      label: 'Menor Aprendiz',       description: 'Programa de aprendizagem' },
  { value: 'marketing',           label: 'Marketing',            description: 'Comunicação e marketing' },
  { value: 'resp_tecnica',        label: 'Responsável Técnica',  description: 'Responsável técnico(a) da unidade' },
  { value: 'musicoterapeuta',     label: 'Musicoterapeuta',      description: 'Musicoterapia e atividades musicais' },
  { value: 'fonoaudiologa',       label: 'Fonoaudiólogo(a)',     description: 'Fonoaudiologia e comunicação' },
]

// ─── Docs ─────────────────────────────────────────────────────────────────────

const DOC_CATEGORY_LABELS: Record<string, string> = {
  identificacao:     'Identificação',
  comprovante:       'Comprovante de Residência',
  escolaridade:      'Escolaridade / Diploma',
  trabalhista:       'Documentos Trabalhistas',
  saude:             'Saúde',
  beneficios:        'Benefícios',
  dependentes:       'Dependentes',
  empresa:           'Documentação da Empresa',
  regularidade:      'Regularidade Fiscal',
  contrato_prestacao:'Contrato de Prestação',
  inss_beneficio:    'Benefício INSS',
  outros:            'Outros',
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  pendente:  { label: 'Pendente',  color: '#B45309', bg: '#FEF3C7' },
  enviado:   { label: 'Enviado',   color: '#1D4ED8', bg: '#EFF6FF' },
  validado:  { label: 'Validado',  color: '#166534', bg: '#F0FDF4' },
  rejeitado: { label: 'Rejeitado', color: '#B91C1C', bg: '#FEF2F2' },
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #EDE0C8', borderRadius: 8,
  fontSize: 14, fontFamily: 'var(--font-lato)', outline: 'none', color: '#1C1C1C',
  background: 'white', boxSizing: 'border-box',
}

function Field({ label, children, style = {} }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      {label && (
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9C8E80', marginBottom: 6 }}>
          {label}
        </label>
      )}
      {children}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  user?: UserProfile
  onClose: () => void
  onSaved: () => void
}

type Tab = 'dados' | 'documentos' | 'observacao'

// ─── Modal ────────────────────────────────────────────────────────────────────

export function UserModal({ user, onClose, onSaved }: Props) {
  const isEdit = !!user
  const overlayRef = useRef<HTMLDivElement>(null)

  const [tab, setTab] = useState<Tab>('dados')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // ── Dados form ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name:     user?.name ?? '',
    email:    user?.email ?? '',
    password: '',
    notes:    user?.notes ?? '',
  })
  const set = (field: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  // ── Profissões múltiplas ───────────────────────────────────────────────────
  const initialRoles: UserRoleEntry[] =
    user?.roles && user.roles.length > 0
      ? user.roles
      : user?.role
        ? [{ role: user.role, is_primary: true }]
        : []

  const [selectedRoles, setSelectedRoles] = useState<UserRoleEntry[]>(initialRoles)

  const toggleRole = (role: UserRole) => {
    setSelectedRoles(prev => {
      const exists = prev.find(r => r.role === role)
      if (exists) {
        const next = prev.filter(r => r.role !== role)
        if (exists.is_primary && next.length > 0) {
          next[0] = { ...next[0], is_primary: true }
        }
        return next
      }
      return [...prev, { role, is_primary: prev.length === 0 }]
    })
  }

  const setPrimary = (role: UserRole) => {
    setSelectedRoles(prev => prev.map(r => ({ ...r, is_primary: r.role === role })))
  }

  // ── Documentos ────────────────────────────────────────────────────────────
  const [employeeType, setEmployeeType] = useState<EmployeeType>('pf')
  const [docs, setDocs] = useState<UserDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingDocId = useRef<string | null>(null)

  useEffect(() => {
    if (isEdit && tab === 'documentos' && user?.id) {
      fetchDocs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isEdit, user?.id, employeeType])

  const fetchDocs = async () => {
    setDocsLoading(true)
    try {
      // employee_type garante que a aba selecionada seja semeada se ainda vazia.
      const res = await fetch(`/api/user-documents?user_id=${user!.id}&employee_type=${employeeType}`)
      const data = await res.json()
      setDocs(data.documents ?? [])
    } finally {
      setDocsLoading(false)
    }
  }

  const handleUploadClick = (docId: string) => {
    pendingDocId.current = docId
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const docId = pendingDocId.current
    if (!file || !docId || !user?.id) return
    e.target.value = ''

    setUploadingDocId(docId)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('doc_id', docId)
      fd.append('user_id', user.id)

      const res = await fetch('/api/user-documents/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro no upload')

      setDocs(prev => prev.map(d =>
        d.id === docId ? { ...d, status: 'enviado', file_name: file.name, uploaded_at: new Date().toISOString() } : d
      ))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro no upload')
    } finally {
      setUploadingDocId(null)
      pendingDocId.current = null
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email) { setError('Nome e e-mail são obrigatórios'); return }
    if (!isEdit && !form.password) { setError('Senha é obrigatória'); return }
    if (selectedRoles.length === 0) { setError('Selecione ao menos uma profissão'); return }

    setSaving(true)
    setError(null)
    try {
      const payload = isEdit
        ? { id: user!.id, name: form.name, email: form.email, notes: form.notes, roles: selectedRoles }
        : { name: form.name, email: form.email, password: form.password, notes: form.notes, roles: selectedRoles }

      const res = await fetch('/api/users', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar colaborador')
      setSuccess(true)
      setTimeout(onSaved, 1400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
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
      setTimeout(onSaved, 1400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  // ── Close só pelo X ou Cancelar (nunca pelo overlay) ─────────────────────
  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) e.preventDefault()
  }

  // ── Success screen ────────────────────────────────────────────────────────
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

  // ── Filtered docs by employee type ────────────────────────────────────────
  const filteredDocs = docs.filter(d => d.employee_type === employeeType)
  const docsByCategory = filteredDocs.reduce<Record<string, UserDocument[]>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  const pendingCount = docs.filter(d => d.status === 'pendente').length

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOverlayMouseDown}
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
    >
      {/* Input de arquivo oculto para upload de docs */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={handleFileChange}
      />

      <div style={{ background: 'white', borderRadius: 16, width: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '24px 24px 0', borderBottom: '1px solid #F7F0E3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#B8864E', marginBottom: 4 }}>
                {isEdit ? 'Editar colaborador' : 'Novo colaborador'}
              </div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 700, color: '#1C1C1C', margin: 0 }}>
                {isEdit ? user.name : 'Adicionar colaborador'}
              </h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9C8E80', padding: 4, lineHeight: 1 }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {(['dados', 'documentos', 'observacao'] as Tab[]).map(t => {
              const labels: Record<Tab, string> = {
                dados:       'Dados',
                documentos:  `Documentos${isEdit && pendingCount > 0 ? ` (${pendingCount})` : ''}`,
                observacao:  'Observação',
              }
              const active = tab === t
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px',
                    fontSize: 13, fontWeight: active ? 700 : 400,
                    color: active ? '#B8864E' : '#9C8E80',
                    borderBottom: active ? '2px solid #B8864E' : '2px solid transparent',
                    marginBottom: -1, transition: 'all 0.15s',
                  }}
                >
                  {labels[t]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24, flex: 1 }}>

          {/* ── TAB: DADOS ── */}
          {tab === 'dados' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Nome completo *">
                  <input
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    style={inputStyle}
                    required
                  />
                </Field>
                <Field label="E-mail *">
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="carlos@villaamor.com.br"
                    style={inputStyle}
                    required
                  />
                  {isEdit && (
                    <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 4 }}>
                      Alterar o e-mail atualiza o acesso ao sistema.
                    </div>
                  )}
                </Field>
              </div>

              {!isEdit && (
                <Field label="Senha de acesso *">
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={inputStyle}
                    required
                  />
                  <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 4 }}>
                    O colaborador pode alterar a senha após o primeiro acesso.
                  </div>
                </Field>
              )}

              <Field label="Profissões *">
                <div style={{ fontSize: 11, color: '#9C8E80', marginBottom: 8 }}>
                  Selecione uma ou mais. Marque a <strong>principal</strong> para acesso ao sistema.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {ROLE_OPTIONS.map(opt => {
                    const entry = selectedRoles.find(r => r.role === opt.value)
                    const checked = !!entry
                    const isPrimary = entry?.is_primary ?? false
                    return (
                      <label
                        key={opt.value}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                          borderRadius: 10, cursor: 'pointer',
                          border: `1.5px solid ${checked ? '#B8864E' : '#EDE0C8'}`,
                          background: checked ? '#FFF8EE' : 'white',
                          transition: 'all 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRole(opt.value)}
                          style={{ accentColor: '#B8864E', marginTop: 2, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: checked ? '#B8864E' : '#1C1C1C' }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: 10, color: '#9C8E80' }}>{opt.description}</div>
                          {checked && (
                            <label
                              style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, cursor: 'pointer' }}
                              onClick={e => e.stopPropagation()}
                            >
                              <input
                                type="radio"
                                name="primary_role"
                                checked={isPrimary}
                                onChange={() => setPrimary(opt.value)}
                                style={{ accentColor: '#B8864E' }}
                              />
                              <span style={{ fontSize: 10, color: isPrimary ? '#B8864E' : '#9C8E80', fontWeight: isPrimary ? 700 : 400 }}>
                                Principal
                              </span>
                            </label>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </Field>
            </div>
          )}

          {/* ── TAB: DOCUMENTOS ── */}
          {tab === 'documentos' && (
            <div>
              {!isEdit ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#9C8E80', fontSize: 13 }}>
                  Salve o colaborador primeiro para gerenciar os documentos.
                </div>
              ) : (
                <>
                  {/* Tipo de colaborador */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {(['pf', 'pj', 'pcd'] as EmployeeType[]).map(t => {
                      const labels = { pf: 'Pessoa Física', pj: 'Pessoa Jurídica', pcd: 'Pessoa com Deficiência' }
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEmployeeType(t)}
                          style={{
                            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            border: `1.5px solid ${employeeType === t ? '#B8864E' : '#EDE0C8'}`,
                            background: employeeType === t ? '#B8864E' : 'white',
                            color: employeeType === t ? 'white' : '#9C8E80',
                            transition: 'all 0.15s',
                          }}
                        >
                          {labels[t]}
                        </button>
                      )
                    })}
                  </div>

                  {docsLoading ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#9C8E80', fontSize: 13 }}>
                      Carregando documentos...
                    </div>
                  ) : filteredDocs.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#9C8E80', fontSize: 13 }}>
                      Nenhum documento cadastrado para este tipo.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {Object.entries(docsByCategory).map(([cat, catDocs]) => (
                        <div key={cat}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#B8864E', marginBottom: 8 }}>
                            {DOC_CATEGORY_LABELS[cat] ?? cat}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {catDocs.map(doc => {
                              const badge = STATUS_BADGE[doc.status] ?? STATUS_BADGE.pendente
                              const uploading = uploadingDocId === doc.id
                              return (
                                <div
                                  key={doc.id}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 14px', borderRadius: 8,
                                    border: '1px solid #EDE0C8', background: '#FAFAFA',
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1C' }}>{doc.doc_name}</div>
                                    {doc.file_name && (
                                      <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 2 }}>{doc.file_name}</div>
                                    )}
                                  </div>
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                                    color: badge.color, background: badge.bg,
                                  }}>
                                    {badge.label}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUploadClick(doc.id)}
                                    disabled={uploading}
                                    style={{
                                      padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                      cursor: uploading ? 'default' : 'pointer',
                                      border: '1.5px solid #EDE0C8', background: 'white', color: '#B8864E',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {uploading ? '...' : doc.storage_path ? 'Substituir' : 'Enviar'}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── TAB: OBSERVAÇÃO ── */}
          {tab === 'observacao' && (
            <Field label="Observações sobre o colaborador">
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Informações relevantes, restrições, acordos especiais..."
                rows={8}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              />
              <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 4 }}>
                Visível apenas para administradores e supervisores.
              </div>
            </Field>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #EF4444', borderRadius: 8, padding: '10px 14px', marginTop: 16, fontSize: 13, color: '#B91C1C' }}>
              {error}
            </div>
          )}

          {/* Footer (só aparece nas tabs com ação de salvar) */}
          {(tab === 'dados' || tab === 'observacao') && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              {isEdit && (
                <Btn variant="danger" size="md" type="button" onClick={() => setConfirmDelete(true)} disabled={saving || deleting} style={{ marginRight: 'auto' }}>
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </Btn>
              )}
              <Btn variant="ghost" size="md" type="button" onClick={onClose} disabled={saving || deleting}>
                Cancelar
              </Btn>
              <Btn variant="primary" size="md" disabled={saving || deleting}>
                {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Adicionar colaborador'}
              </Btn>
            </div>
          )}
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
