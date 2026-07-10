'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Resident, DependencyLevel, ResidentResponsible, ResidentDocument } from '@/types'
import { residentRepository, CreateResidentDTO } from '@/services/repositories/resident-repository'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Btn } from '../ui'

interface Props {
  resident?: Resident
  onClose: () => void
  onSaved: (r: Resident) => void
  onDeleted?: (id: string) => void
}

// ── Labels ────────────────────────────────────────────────────────────────────

const DEP_OPTIONS: { value: DependencyLevel; label: string; color: string }[] = [
  { value: 'independent', label: 'Independente', color: '#15803D' },
  { value: 'g1',          label: 'G1 — Grau 1',  color: '#1D4ED8' },
  { value: 'g2',          label: 'G2 — Grau 2',  color: '#B45309' },
  { value: 'g3',          label: 'G3 — Grau 3',  color: '#B91C1C' },
  { value: 'bedridden',   label: 'Acamado',       color: '#7C3AED' },
]

const SEXUALITY_OPTIONS = [
  { value: 'masculino',           label: 'Masculino' },
  { value: 'feminino',            label: 'Feminino' },
  { value: 'outro',               label: 'Outro' },
  { value: 'prefiro_nao_informar', label: 'Prefiro não informar' },
]

const STAY_TYPE_OPTIONS = [
  { value: 'moradia',    label: 'Moradia' },
  { value: 'day_care',   label: 'Day Care' },
  { value: 'temporada',  label: 'Temporada' },
]

const PAYMENT_MODALITY_OPTIONS = [
  { value: 'pague_use', label: 'Pague e use' },
  { value: 'use_pague', label: 'Use e pague' },
]

const EXIT_REASON_OPTIONS = [
  { value: 'distrato', label: 'Distrato' },
  { value: 'obito',    label: 'Óbito' },
]

const RELATIONSHIP_OPTIONS = [
  'Filho(a)', 'Cônjuge', 'Irmão(ã)', 'Neto(a)', 'Sobrinho(a)', 'Pai / Mãe', 'Amigo(a)', 'Outro',
]

const DOC_TYPE_LABELS: Record<string, string> = {
  rg:                    'RG',
  cpf:                   'CPF',
  vacina:                'Carteira de Vacina',
  contrato_social:       'Contrato Social',
  plano_saude:           'Plano de Saúde / SUS',
  plano_funerario:       'Plano Funerário',
  comprovante_residencia:'Comprovante de Residência',
}

const DOC_ORDER = ['rg','cpf','vacina','contrato_social','plano_saude','plano_funerario','comprovante_residencia']

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  pendente:  { label: 'Pendente',  bg: '#F7F0E3', color: '#9C8E80' },
  enviado:   { label: 'Enviado',   bg: '#EFF6FF', color: '#1D4ED8' },
  validado:  { label: 'Validado',  bg: '#F0FDF4', color: '#15803D' },
  rejeitado: { label: 'Rejeitado', bg: '#FEF2F2', color: '#B91C1C' },
}

// ── Checklist placeholder G1/G2/G3 ───────────────────────────────────────────

const CHECKLIST_QUESTIONS = [
  { id: 'q1',  category: 'Mobilidade',    text: 'Necessita de auxílio para locomoção (andar, levantar)?',           pts: 4 },
  { id: 'q2',  category: 'Mobilidade',    text: 'Utiliza cadeira de rodas, andador ou muleta permanentemente?',     pts: 5 },
  { id: 'q3',  category: 'Mobilidade',    text: 'Permanece acamado a maior parte do tempo?',                       pts: 7 },
  { id: 'q4',  category: 'Cognição',      text: 'Apresenta desorientação temporal ou espacial frequente?',         pts: 4 },
  { id: 'q5',  category: 'Cognição',      text: 'Necessita de supervisão constante por risco de queda ou fuga?',   pts: 5 },
  { id: 'q6',  category: 'Cognição',      text: 'Possui diagnóstico de demência (Alzheimer, etc.)?',               pts: 4 },
  { id: 'q7',  category: 'Higiene',       text: 'Necessita de auxílio total para banho e higiene pessoal?',        pts: 4 },
  { id: 'q8',  category: 'Higiene',       text: 'Necessita de auxílio para troca de fraldas?',                     pts: 5 },
  { id: 'q9',  category: 'Alimentação',   text: 'Necessita de auxílio para se alimentar (dieta pastosa/enteral)?', pts: 4 },
  { id: 'q10', category: 'Alimentação',   text: 'Recusa alimentação com frequência exigindo supervisão?',          pts: 3 },
  { id: 'q11', category: 'Continência',   text: 'Apresenta incontinência urinária?',                               pts: 3 },
  { id: 'q12', category: 'Continência',   text: 'Apresenta incontinência fecal?',                                  pts: 4 },
]

const MAX_SCORE = CHECKLIST_QUESTIONS.reduce((s, q) => s + q.pts, 0)

function scoreToGrade(score: number): DependencyLevel {
  const pct = score / MAX_SCORE
  if (pct <= 0.25) return 'independent'
  if (pct <= 0.45) return 'g1'
  if (pct <= 0.70) return 'g2'
  return 'g3'
}

// ── Cálculo de residual ───────────────────────────────────────────────────────

function calcResidual(exitDate: string, monthlyValue: number): number {
  const d      = new Date(exitDate)
  const year   = d.getFullYear()
  const month  = d.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dayOfExit   = d.getDate()
  const remaining   = daysInMonth - dayOfExit
  return Math.round((remaining / daysInMonth) * monthlyValue * 100) / 100
}

// ── Helpers de layout ──────────────────────────────────────────────────────────

function maskCPF(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14)
}
function maskPhone(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15)
}
function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'identificacao', label: 'Identificação' },
  { id: 'classificacao', label: 'Classificação' },
  { id: 'responsaveis',  label: 'Responsáveis'  },
  { id: 'documentos',    label: 'Documentos'    },
  { id: 'financeiro',    label: 'Financeiro'    },
  { id: 'saude',         label: 'Saúde / Obs.'  },
] as const

type TabId = typeof TABS[number]['id']

// ── Modal principal ───────────────────────────────────────────────────────────

export function ResidentModal({ resident, onClose, onSaved, onDeleted }: Props) {
  const isEdit = !!resident
  const overlayRef = useRef<HTMLDivElement>(null)

  const [tab, setTab]             = useState<TabId>('identificacao')
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [showChecklist, setShowChecklist] = useState(false)

  // Responsáveis
  const [responsibles, setResponsibles]   = useState<ResidentResponsible[]>([])
  const [loadingResp, setLoadingResp]     = useState(false)
  const [showAddResp, setShowAddResp]     = useState(false)

  // Documentos
  const [documents, setDocuments] = useState<ResidentDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const uploadRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Foto
  const [photoPreview, setPhotoPreview] = useState<string | null>(resident?.photo_url ?? null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<CreateResidentDTO>({
    name:               resident?.name ?? '',
    nickname:           resident?.nickname ?? '',
    birth_date:         resident?.birth_date ?? '',
    nationality:        resident?.nationality ?? 'Brasileira',
    naturalness:        resident?.naturalness ?? '',
    sexuality:          resident?.sexuality ?? '',
    cpf:                resident?.cpf ?? '',
    rg:                 resident?.rg ?? '',
    rg_issuer:          resident?.rg_issuer ?? '',
    rg_issue_date:      resident?.rg_issue_date ?? '',
    room_number:        resident?.room_number ?? '',
    admission_date:     resident?.admission_date ?? '',
    contract_number:    resident?.contract_number ?? '',
    dependency_level:   resident?.dependency_level ?? 'independent',
    is_bedridden:       resident?.is_bedridden ?? false,
    responsible_name:         resident?.responsible_name ?? '',
    responsible_relationship: resident?.responsible_relationship ?? '',
    responsible_cpf:          resident?.responsible_cpf ?? '',
    responsible_phone:        resident?.responsible_phone ?? '',
    responsible_email:        resident?.responsible_email ?? '',
    responsible_address:      resident?.responsible_address ?? '',
    doctor_name:          resident?.doctor_name ?? '',
    doctor_crm:           resident?.doctor_crm ?? '',
    health_insurance:     resident?.health_insurance ?? '',
    health_insurance_number: resident?.health_insurance_number ?? '',
    diagnoses:            resident?.diagnoses ?? '',
    allergies:            resident?.allergies ?? '',
    medications:          resident?.medications ?? '',
    entry_date:           resident?.entry_date ?? '',
    exit_date:            resident?.exit_date ?? '',
    exit_reason:          resident?.exit_reason ?? '',
    payment_day:          resident?.payment_day ?? null,
    payment_modality:     resident?.payment_modality ?? '',
    stay_type:            resident?.stay_type ?? '',
    monthly_value:        resident?.monthly_value ?? null,
    is_prospect:          resident?.is_prospect ?? false,
    notes:                resident?.notes ?? '',
    photo_url:            resident?.photo_url ?? '',
  })

  const set = (field: keyof CreateResidentDTO, value: string | boolean | number | null) =>
    setForm(prev => ({ ...prev, [field]: value }))

  // Carrega responsáveis e documentos ao abrir modal em modo edição
  const fetchResponsibles = useCallback(async () => {
    if (!resident?.id) return
    setLoadingResp(true)
    try {
      const res = await fetch(`/api/resident-responsibles?resident_id=${resident.id}`)
      const json = await res.json()
      setResponsibles(json.responsibles ?? [])
    } finally {
      setLoadingResp(false)
    }
  }, [resident?.id])

  const fetchDocuments = useCallback(async () => {
    if (!resident?.id) return
    setLoadingDocs(true)
    try {
      const res = await fetch(`/api/resident-documents?resident_id=${resident.id}`)
      const json = await res.json()
      setDocuments(json.documents ?? [])
    } finally {
      setLoadingDocs(false)
    }
  }, [resident?.id])

  useEffect(() => {
    if (isEdit) {
      fetchResponsibles()
      fetchDocuments()
    }
  }, [isEdit, fetchResponsibles, fetchDocuments])

  // Overlay: fecha só se clicar exatamente no overlay
  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose()
  }

  // Seleção de foto — guarda o arquivo e mostra preview local.
  // O upload real acontece no submit (precisa do id do residente para a rota /storage).
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('A foto deve ser um arquivo de imagem.')
      return
    }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // Envia a foto ao storage; retorna a URL pública gravada em residents.photo_url.
  const uploadPhoto = async (residentId: string): Promise<string | null> => {
    if (!photoFile) return null
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('file', photoFile)
      fd.append('resident_id', residentId)
      const res = await fetch('/api/residents/photo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Falha ao enviar foto')
      return json.photo_url as string
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Upload de documento
  const handleDocUpload = async (doc: ResidentDocument, file: File) => {
    if (!resident?.id) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('doc_id', doc.id)
    formData.append('resident_id', resident.id)
    const res = await fetch('/api/resident-documents/upload', { method: 'POST', body: formData })
    if (res.ok) {
      const json = await res.json()
      setDocuments(prev => prev.map(d => d.id === doc.id ? json.document : d))
    }
  }

  // Atualiza status de documento (admin pode validar/rejeitar)
  const handleDocStatus = async (doc: ResidentDocument, status: string) => {
    const res = await fetch('/api/resident-documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: doc.id, status }),
    })
    if (res.ok) {
      const json = await res.json()
      setDocuments(prev => prev.map(d => d.id === doc.id ? json.document : d))
    }
  }

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

      // Upload da foto (se selecionada) — só possível após termos o id do residente.
      if (photoFile) {
        try {
          const photoUrl = await uploadPhoto(saved.id)
          if (photoUrl) saved.photo_url = photoUrl
        } catch (photoErr) {
          // Residente foi salvo; sinaliza falha só da foto sem perder o cadastro.
          setError(photoErr instanceof Error ? `Residente salvo, mas a foto falhou: ${photoErr.message}` : 'Residente salvo, mas a foto falhou.')
          setSaving(false)
          return
        }
      }

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

  const residualValue = form.exit_date && form.monthly_value
    ? calcResidual(form.exit_date, Number(form.monthly_value))
    : null

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOverlayMouseDown}
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
    >
      <div
        style={{ background: 'white', borderRadius: 16, width: 680, maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '22px 24px 0', borderBottom: '1px solid #F7F0E3', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {/* Avatar / foto */}
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{ width: 52, height: 52, borderRadius: '50%', background: '#F7F0E3', border: '2px dashed #D9C9A8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, position: 'relative' }}
                title="Clique para adicionar foto"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 22 }}>📷</span>
                )}
                {uploadingPhoto && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,28,28,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                    ...
                  </div>
                )}
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#B8864E', marginBottom: 4 }}>
                  {isEdit ? 'Editar residente' : 'Novo residente'}
                  {form.is_prospect && <span style={{ marginLeft: 8, background: '#EFF6FF', color: '#1D4ED8', borderRadius: 4, padding: '1px 6px', fontSize: 9 }}>PRÉ-CADASTRO</span>}
                </div>
                <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 700, color: '#1C1C1C', margin: 0 }}>
                  {isEdit ? resident.name : 'Cadastrar residente'}
                </h2>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9C8E80', padding: 4, marginTop: -2 }}>✕</button>
          </div>

          {/* Tabs — scroll horizontal em telas pequenas */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
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
                {/* Toggle pré-cadastro */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', background: form.is_prospect ? '#EFF6FF' : '#F7F0E3', borderRadius: 10, border: `1.5px solid ${form.is_prospect ? '#BFDBFE' : '#EDE0C8'}` }}>
                  <input type="checkbox" checked={form.is_prospect} onChange={e => set('is_prospect', e.target.checked)} style={{ width: 18, height: 18, accentColor: '#1D4ED8', cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: form.is_prospect ? '#1D4ED8' : '#5C5248' }}>
                    Pré-cadastro / Prospecção
                  </span>
                  <span style={{ fontSize: 11, color: '#9C8E80', marginLeft: 4 }}>— residente ainda não confirmado</span>
                </label>

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

                <Field label="Sexualidade">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {SEXUALITY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set('sexuality', opt.value)}
                        style={chipStyle(form.sexuality === opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <SectionTitle>Documentos de Identidade</SectionTitle>
                <Row>
                  <Field label="CPF">
                    <input value={form.cpf ?? ''} onChange={e => set('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} style={inputStyle} />
                  </Field>
                  <Field label="RG">
                    <input value={form.rg ?? ''} onChange={e => set('rg', e.target.value)} placeholder="Ex: 12.345.678-9" style={inputStyle} />
                  </Field>
                </Row>
                <Row>
                  <Field label="Órgão emissor">
                    <input value={form.rg_issuer ?? ''} onChange={e => set('rg_issuer', e.target.value)} placeholder="Ex: SSP/SP" style={inputStyle} />
                  </Field>
                  <Field label="Data de emissão">
                    <input type="date" value={form.rg_issue_date ?? ''} onChange={e => set('rg_issue_date', e.target.value)} style={inputStyle} />
                  </Field>
                </Row>

                <SectionTitle>Alojamento</SectionTitle>
                <Row>
                  <Field label="Número do quarto *">
                    <input value={form.room_number} onChange={e => set('room_number', e.target.value)} placeholder="Ex: 101" required style={inputStyle} />
                  </Field>
                  <Field label="Número do contrato">
                    <input value={form.contract_number ?? ''} onChange={e => set('contract_number', e.target.value)} placeholder="Ex: CT-2024-001" style={inputStyle} />
                  </Field>
                  <Field label="Data de admissão">
                    <input type="date" value={form.admission_date ?? ''} onChange={e => set('admission_date', e.target.value)} style={inputStyle} />
                  </Field>
                </Row>
              </div>
            )}

            {/* ── CLASSIFICAÇÃO ── */}
            {tab === 'classificacao' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <SectionTitle>Nível de Dependência</SectionTitle>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {DEP_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { set('dependency_level', opt.value); set('is_bedridden', opt.value === 'bedridden') }}
                      style={{
                        padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'var(--font-lato)', border: `2px solid ${form.dependency_level === opt.value ? opt.color : '#EDE0C8'}`,
                        background: form.dependency_level === opt.value ? opt.color : 'white',
                        color: form.dependency_level === opt.value ? 'white' : '#5C5248',
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div style={{ background: '#F7F0E3', borderRadius: 12, padding: '14px 18px', fontSize: 13, color: '#5C5248', lineHeight: 1.6 }}>
                  <strong>Legenda:</strong> G1 = leve dependência, G2 = moderada, G3 = alta dependência.
                  <br />Use o checklist abaixo para classificar automaticamente com base nas necessidades do residente.
                </div>

                <Btn
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setShowChecklist(true)}
                >
                  Abrir checklist de classificação (Evelyn)
                </Btn>

                {showChecklist && (
                  <ClassificationChecklist
                    current={form.dependency_level}
                    onApply={(level) => {
                      set('dependency_level', level)
                      set('is_bedridden', level === 'bedridden')
                      setShowChecklist(false)
                    }}
                    onClose={() => setShowChecklist(false)}
                  />
                )}
              </div>
            )}

            {/* ── RESPONSÁVEIS ── */}
            {tab === 'responsaveis' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {!isEdit && (
                  <div style={{ background: '#FFF8EE', border: '1.5px solid #FDDEA0', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#7a5c1a' }}>
                    Salve o cadastro primeiro para adicionar responsáveis adicionais.
                  </div>
                )}

                {isEdit && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <SectionTitle>Responsáveis cadastrados</SectionTitle>
                      <Btn type="button" variant="secondary" size="sm" onClick={() => setShowAddResp(true)}>
                        + Adicionar
                      </Btn>
                    </div>

                    {loadingResp ? (
                      <div style={{ textAlign: 'center', padding: 20, color: '#9C8E80' }}>Carregando...</div>
                    ) : responsibles.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 20, color: '#9C8E80', background: '#F7F0E3', borderRadius: 10 }}>
                        {'Nenhum responsável cadastrado. Clique em "+ Adicionar".'}
                      </div>
                    ) : (
                      <>
                        {/* Responsáveis ativos */}
                        {responsibles.filter(r => !r.is_blocked).map(resp => (
                          <ResponsibleCard
                            key={resp.id}
                            responsible={resp}
                            onBlock={async (reason) => {
                              await fetch('/api/resident-responsibles', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: resp.id, is_blocked: true, block_reason: reason, resident_id: resident?.id }),
                              })
                              fetchResponsibles()
                            }}
                            onDelete={async () => {
                              await fetch(`/api/resident-responsibles?id=${resp.id}`, { method: 'DELETE' })
                              fetchResponsibles()
                            }}
                          />
                        ))}

                        {/* Seção: Responsáveis bloqueados */}
                        {responsibles.some(r => r.is_blocked) && (
                          <>
                            <SectionTitle>Responsáveis bloqueados</SectionTitle>
                            {responsibles.filter(r => r.is_blocked).map(resp => (
                              <ResponsibleCard
                                key={resp.id}
                                responsible={resp}
                                blocked
                                onUnblock={async () => {
                                  await fetch('/api/resident-responsibles', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: resp.id, is_blocked: false, block_reason: null }),
                                  })
                                  fetchResponsibles()
                                }}
                              />
                            ))}
                          </>
                        )}
                      </>
                    )}

                    {showAddResp && (
                      <AddResponsibleForm
                        residentId={resident!.id}
                        onSaved={() => { setShowAddResp(false); fetchResponsibles() }}
                        onCancel={() => setShowAddResp(false)}
                      />
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── DOCUMENTOS ── */}
            {tab === 'documentos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {!isEdit ? (
                  <div style={{ background: '#FFF8EE', border: '1.5px solid #FDDEA0', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#7a5c1a' }}>
                    Salve o cadastro primeiro para fazer upload de documentos.
                  </div>
                ) : loadingDocs ? (
                  <div style={{ textAlign: 'center', padding: 20, color: '#9C8E80' }}>Carregando...</div>
                ) : (
                  DOC_ORDER.map(docType => {
                    const doc = documents.find(d => d.doc_type === docType)
                    const cfg = doc ? (STATUS_CFG[doc.status] ?? STATUS_CFG.pendente) : STATUS_CFG.pendente
                    return (
                      <div key={docType} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#FDFAF5', border: '1.5px solid #F7F0E3', borderRadius: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#1C1C1C' }}>{DOC_TYPE_LABELS[docType]}</div>
                          {doc?.file_name && <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 2 }}>{doc.file_name}</div>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        {doc && doc.status === 'enviado' && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button type="button" onClick={() => handleDocStatus(doc, 'validado')} style={{ ...smallBtnStyle, background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>✓</button>
                            <button type="button" onClick={() => handleDocStatus(doc, 'rejeitado')} style={{ ...smallBtnStyle, background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>✕</button>
                          </div>
                        )}
                        {doc && (
                          <>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              style={{ display: 'none' }}
                              ref={el => { uploadRefs.current[docType] = el }}
                              onChange={e => { const f = e.target.files?.[0]; if (f && doc) handleDocUpload(doc, f) }}
                            />
                            <button
                              type="button"
                              onClick={() => uploadRefs.current[docType]?.click()}
                              style={{ ...smallBtnStyle, background: '#F7F0E3', color: '#B8864E', border: '1px solid #EDE0C8' }}
                            >
                              {doc.storage_path ? '↑ Trocar' : '↑ Enviar'}
                            </button>
                          </>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* ── FINANCEIRO ── */}
            {tab === 'financeiro' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <SectionTitle>Modalidade de Estadia</SectionTitle>
                <Field label="Tipo de estadia">
                  <div style={{ display: 'flex', gap: 8 }}>
                    {STAY_TYPE_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => set('stay_type', opt.value)} style={chipStyle(form.stay_type === opt.value)}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Modalidade de pagamento">
                  <div style={{ display: 'flex', gap: 8 }}>
                    {PAYMENT_MODALITY_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => set('payment_modality', opt.value)} style={chipStyle(form.payment_modality === opt.value)}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Row>
                  <Field label="Valor mensal (R$)">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.monthly_value ?? ''}
                      onChange={e => set('monthly_value', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Ex: 5500.00"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Dia de pagamento">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.payment_day ?? ''}
                      onChange={e => set('payment_day', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Ex: 5"
                      style={inputStyle}
                    />
                  </Field>
                </Row>

                <SectionTitle>Entrada e Saída</SectionTitle>
                <Row>
                  <Field label="Data de entrada">
                    <input type="date" value={form.entry_date ?? ''} onChange={e => set('entry_date', e.target.value)} style={inputStyle} />
                  </Field>
                  <Field label="Data de saída">
                    <input type="date" value={form.exit_date ?? ''} onChange={e => set('exit_date', e.target.value)} style={inputStyle} />
                  </Field>
                </Row>

                {form.exit_date && (
                  <Field label="Motivo da saída">
                    <div style={{ display: 'flex', gap: 8 }}>
                      {EXIT_REASON_OPTIONS.map(opt => (
                        <button key={opt.value} type="button" onClick={() => set('exit_reason', opt.value)} style={chipStyle(form.exit_reason === opt.value)}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}

                {/* Calculadora de residual */}
                {residualValue !== null && (
                  <div style={{ background: '#F7F0E3', border: '1.5px solid #EDE0C8', borderRadius: 12, padding: '16px 20px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9C8E80', marginBottom: 6 }}>
                      Cálculo de Residual
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#B8864E', fontFamily: 'var(--font-playfair)' }}>
                      {fmtBRL(residualValue)}
                    </div>
                    <div style={{ fontSize: 12, color: '#9C8E80', marginTop: 4 }}>
                      Valor proporcional aos dias restantes no mês após {form.exit_date}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── SAÚDE / OBSERVAÇÕES ── */}
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
                    <input value={form.health_insurance ?? ''} onChange={e => set('health_insurance', e.target.value)} placeholder="Ex: Unimed, SUS" style={inputStyle} />
                  </Field>
                  <Field label="Número da carteirinha">
                    <input value={form.health_insurance_number ?? ''} onChange={e => set('health_insurance_number', e.target.value)} placeholder="Ex: 00000000000000" style={inputStyle} />
                  </Field>
                </Row>

                <SectionTitle>Histórico Clínico</SectionTitle>
                <Field label="Diagnósticos / CIDs">
                  <textarea value={form.diagnoses ?? ''} onChange={e => set('diagnoses', e.target.value)} placeholder="Ex: Alzheimer (F00), Hipertensão Arterial (I10)..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </Field>
                <Field label="Alergias">
                  <textarea value={form.allergies ?? ''} onChange={e => set('allergies', e.target.value)} placeholder="Ex: Dipirona, Penicilina..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                </Field>
                <Field label="Medicamentos em uso">
                  <textarea value={form.medications ?? ''} onChange={e => set('medications', e.target.value)} placeholder="Ex: Losartana 50mg (1x dia)..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </Field>

                <SectionTitle>Observações</SectionTitle>
                <Field label="Observações gerais">
                  <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Preferências, rotinas, aspectos comportamentais, histórico relevante..." rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
                </Field>
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

            {/* Dots de navegação */}
            <div style={{ display: 'flex', gap: 6, marginRight: 'auto' }}>
              {TABS.map(t => (
                <div
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{ width: 8, height: 8, borderRadius: '50%', cursor: 'pointer', background: tab === t.id ? '#B8864E' : '#EDE0C8', transition: 'background 0.2s' }}
                />
              ))}
            </div>

            {error && <div style={{ fontSize: 12, color: '#B91C1C', flex: 1, textAlign: 'right' }}>{error}</div>}

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
        message={`Tem certeza que deseja desativar o cadastro de ${resident?.name}? O histórico será preservado.`}
        confirmLabel="Desativar"
        onConfirm={() => { setConfirmDelete(false); handleDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

// ── Checklist de classificação ────────────────────────────────────────────────

function ClassificationChecklist({ current, onApply, onClose }: {
  current: DependencyLevel
  onApply: (level: DependencyLevel) => void
  onClose: () => void
}) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const score    = CHECKLIST_QUESTIONS.reduce((s, q) => s + (answers[q.id] ? q.pts : 0), 0)
  const suggested = scoreToGrade(score)
  const pct      = Math.round((score / MAX_SCORE) * 100)

  const categories = [...new Set(CHECKLIST_QUESTIONS.map(q => q.category))]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'white', borderRadius: 16, width: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F7F0E3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#B8864E' }}>Checklist</div>
            <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 700, color: '#1C1C1C', margin: 0 }}>Classificação G1/G2/G3</h3>
            <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 2 }}>⚠️ Placeholder — questões a revisar com Evelyn</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9C8E80' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {categories.map(cat => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#B8864E', marginBottom: 10 }}>{cat}</div>
              {CHECKLIST_QUESTIONS.filter(q => q.category === cat).map(q => (
                <label key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={answers[q.id] ?? false}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: '#B8864E', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
                  />
                  <span style={{ fontSize: 13, color: '#1C1C1C', lineHeight: 1.5 }}>
                    {q.text}
                    <span style={{ marginLeft: 6, fontSize: 10, color: '#9C8E80' }}>({q.pts} pts)</span>
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #F7F0E3', background: '#FDFAF5', borderRadius: '0 0 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#5C5248', fontWeight: 700 }}>Pontuação: {score}/{MAX_SCORE} ({pct}%)</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#B8864E' }}>Sugestão: {DEP_OPTIONS.find(d => d.value === suggested)?.label}</span>
              </div>
              <div style={{ height: 8, background: '#EDE0C8', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#B8864E', borderRadius: 4, transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn type="button" variant="ghost" size="md" onClick={onClose}>Cancelar</Btn>
            <Btn type="button" variant="primary" size="md" onClick={() => onApply(suggested)}>
              Aplicar: {DEP_OPTIONS.find(d => d.value === suggested)?.label}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Card de responsável ───────────────────────────────────────────────────────

function ResponsibleCard({ responsible: r, blocked, onBlock, onUnblock, onDelete }: {
  responsible: ResidentResponsible
  blocked?: boolean
  onBlock?: (reason: string) => void
  onUnblock?: () => void
  onDelete?: () => void
}) {
  const [showBlock, setShowBlock] = useState(false)
  const [blockReason, setBlockReason] = useState('')

  return (
    <div style={{ border: `1.5px solid ${blocked ? '#FECACA' : '#EDE0C8'}`, borderRadius: 10, padding: '14px 16px', background: blocked ? '#FEF2F2' : '#FDFAF5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1C1C1C' }}>{r.name}</span>
            {r.is_primary && <span style={{ background: '#F7F0E3', color: '#B8864E', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999 }}>Principal</span>}
            {r.is_emergency_contact && <span style={{ background: '#FEF2F2', color: '#B91C1C', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999 }}>Emergência</span>}
            {blocked && <span style={{ background: '#FEF2F2', color: '#B91C1C', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999 }}>Bloqueado</span>}
          </div>
          {r.relationship && <div style={{ fontSize: 12, color: '#9C8E80', marginTop: 3 }}>{r.relationship}</div>}
          <div style={{ fontSize: 12, color: '#5C5248', marginTop: 4, display: 'flex', gap: 12 }}>
            {r.phone && <span>📱 {r.phone}</span>}
            {r.email && <span>✉ {r.email}</span>}
          </div>
          {blocked && r.block_reason && (
            <div style={{ fontSize: 11, color: '#B91C1C', marginTop: 6, fontStyle: 'italic' }}>Motivo: {r.block_reason}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {!blocked && onBlock && (
            <button type="button" onClick={() => setShowBlock(true)} style={{ ...smallBtnStyle, background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>Bloquear</button>
          )}
          {blocked && onUnblock && (
            <button type="button" onClick={onUnblock} style={{ ...smallBtnStyle, background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>Desbloquear</button>
          )}
          {!blocked && onDelete && (
            <button type="button" onClick={onDelete} style={{ ...smallBtnStyle, background: '#F7F0E3', color: '#9C8E80', border: '1px solid #EDE0C8' }}>Remover</button>
          )}
        </div>
      </div>
      {showBlock && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={blockReason}
            onChange={e => setBlockReason(e.target.value)}
            placeholder="Motivo do bloqueio..."
            style={{ ...inputStyle, flex: 1, fontSize: 12, padding: '7px 10px' }}
          />
          <button type="button" onClick={() => { onBlock?.(blockReason); setShowBlock(false) }} style={{ ...smallBtnStyle, background: '#B91C1C', color: 'white', border: 'none' }}>Confirmar</button>
          <button type="button" onClick={() => setShowBlock(false)} style={{ ...smallBtnStyle, background: '#F7F0E3', color: '#5C5248', border: '1px solid #EDE0C8' }}>Cancelar</button>
        </div>
      )}
    </div>
  )
}

// ── Formulário de novo responsável ────────────────────────────────────────────

function AddResponsibleForm({ residentId, onSaved, onCancel }: {
  residentId: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({ name: '', relationship: '', phone: '', email: '', cpf: '', address: '', is_primary: false, is_emergency_contact: false })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await fetch('/api/resident-responsibles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resident_id: residentId, ...form }),
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ border: '2px dashed #EDE0C8', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#B8864E', textTransform: 'uppercase', letterSpacing: '1px' }}>Novo responsável</div>
      <Row>
        <Field label="Nome *">
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" style={inputStyle} />
        </Field>
        <Field label="Parentesco">
          <select value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))} style={inputStyle}>
            <option value="">Selecione...</option>
            {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      </Row>
      <Row>
        <Field label="Telefone">
          <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: maskPhone(e.target.value) }))} placeholder="(14) 99999-0000" maxLength={15} style={inputStyle} />
        </Field>
        <Field label="E-mail">
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" style={inputStyle} />
        </Field>
      </Row>
      <div style={{ display: 'flex', gap: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={form.is_primary} onChange={e => setForm(p => ({ ...p, is_primary: e.target.checked }))} style={{ accentColor: '#B8864E' }} />
          Responsável principal
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={form.is_emergency_contact} onChange={e => setForm(p => ({ ...p, is_emergency_contact: e.target.checked }))} style={{ accentColor: '#B91C1C' }} />
          Contato de emergência
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Btn>
        <Btn type="button" variant="primary" size="sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saving ? 'Salvando...' : 'Adicionar'}
        </Btn>
      </div>
    </div>
  )
}

// ── Helpers de layout ─────────────────────────────────────────────────────────

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
      {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9C8E80', marginBottom: 6 }}>{label}</label>}
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #EDE0C8', borderRadius: 8,
  fontSize: 14, fontFamily: 'var(--font-lato)', outline: 'none', color: '#1C1C1C',
  background: 'white', boxSizing: 'border-box',
}
const smallBtnStyle: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'var(--font-lato)', whiteSpace: 'nowrap',
}
function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'var(--font-lato)', border: `1.5px solid ${active ? '#B8864E' : '#EDE0C8'}`,
    background: active ? '#B8864E' : 'white', color: active ? 'white' : '#5C5248', transition: 'all 0.15s',
  }
}
