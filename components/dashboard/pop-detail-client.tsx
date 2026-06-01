'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { POP, POPBlock, POPStep, Resident, UserProfile, POPStaffRotation } from '@/types'
import { SectionHeader, Card, Badge, Btn, Divider, EmptyState } from './ui'
import { BlockModal } from './modals/block-modal'
import { StepModal } from './modals/step-modal'
import { popRepository } from '@/services/repositories/pop-repository'

const STEP_ICONS:  Record<string, string> = { photo: '📸', video: '🎥', checkbox: '✅', conditional: '🔀', timed: '⏱️' }
const STEP_LABELS: Record<string, string> = { photo: 'Foto', video: 'Vídeo', checkbox: 'Confirmação', conditional: 'Condicional', timed: 'Temporizado' }
const DEP_LABELS:  Record<string, string> = { independent: 'Independente', semi: 'Semi-dep.', dependent: 'Dependente', bedridden: 'Acamado' }
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador', supervisor: 'Supervisor',
  operational: 'Cuidador', enfermeiro: 'Enfermeiro(a)',
  fisioterapeuta: 'Fisioterapeuta', psicologo: 'Psicólogo(a)',
  nutricionista: 'Nutricionista', cozinheiro: 'Cozinheiro(a)',
  limpeza: 'Limpeza', multiprofessional: 'Multiprofissional',
}

type Tab = 'passos' | 'residentes' | 'rodizio'
type BlockWithSteps = POPBlock & { steps: POPStep[] }

interface Props {
  pop: POP
  initialBlocks: BlockWithSteps[]
  allResidents: Pick<Resident, 'id' | 'name' | 'room_number' | 'dependency_level' | 'is_bedridden'>[]
  initialAssignedIds: string[]
  initialRotation: POPStaffRotation[]
  allStaff: UserProfile[]
}

export function POPDetailClient({ pop, initialBlocks, allResidents, initialAssignedIds, initialRotation, allStaff }: Props) {
  const [tab, setTab] = useState<Tab>('passos')

  // ── Passos ────────────────────────────────────────────────────────────────
  const [blocks, setBlocks] = useState<BlockWithSteps[]>(initialBlocks)
  const [blockModal, setBlockModal] = useState<{ open: boolean; block?: POPBlock }>({ open: false })
  const [stepModal,  setStepModal]  = useState<{ open: boolean; blockId: string; step?: POPStep }>({ open: false, blockId: '' })

  const handleBlockSaved = (saved: POPBlock) => {
    setBlocks(prev => {
      const exists = prev.find(b => b.id === saved.id)
      const updated = exists
        ? prev.map(b => b.id === saved.id ? { ...b, ...saved } : b)
        : [...prev, { ...saved, steps: [] }]
      return updated.sort((a, b) => a.order_index - b.order_index)
    })
    setBlockModal({ open: false })
  }

  const handleBlockDeleted = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    setBlockModal({ open: false })
  }

  const handleStepSaved = (blockId: string, saved: POPStep) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b
      const exists = b.steps.find(s => s.id === saved.id)
      const updated = exists ? b.steps.map(s => s.id === saved.id ? saved : s) : [...b.steps, saved]
      return { ...b, steps: updated.sort((a, b) => a.order_index - b.order_index) }
    }))
    setStepModal({ open: false, blockId: '' })
  }

  const handleStepDeleted = (blockId: string, stepId: string) => {
    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, steps: b.steps.filter(s => s.id !== stepId) } : b
    ))
    setStepModal({ open: false, blockId: '' })
  }

  // ── Residentes ────────────────────────────────────────────────────────────
  const [assignedIds, setAssignedIds]   = useState<Set<string>>(new Set(initialAssignedIds))
  const [savingAssign, setSavingAssign] = useState<string | null>(null)

  const toggleAssignment = useCallback(async (residentId: string) => {
    const isAssigned = assignedIds.has(residentId)
    setSavingAssign(residentId)
    try {
      if (isAssigned) {
        await popRepository.unassignResident(pop.id, residentId)
        setAssignedIds(prev => { const s = new Set(prev); s.delete(residentId); return s })
      } else {
        await popRepository.assignResident(pop.id, residentId)
        setAssignedIds(prev => new Set(prev).add(residentId))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingAssign(null)
    }
  }, [assignedIds, pop.id])

  // ── Rodízio ───────────────────────────────────────────────────────────────
  const [rotation, setRotation]         = useState<POPStaffRotation[]>(initialRotation)
  const [savingRotation, setSavingRotation] = useState(false)
  // Ordered list of user IDs being edited
  const [rotationDraft, setRotationDraft]   = useState<string[]>(initialRotation.map(r => r.user_id))

  const addToRotation = (userId: string) => {
    if (rotationDraft.includes(userId)) return
    setRotationDraft(prev => [...prev, userId])
  }

  const removeFromRotation = (userId: string) => {
    setRotationDraft(prev => prev.filter(id => id !== userId))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    setRotationDraft(prev => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr
    })
  }

  const moveDown = (index: number) => {
    setRotationDraft(prev => {
      if (index === prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr
    })
  }

  const saveRotation = async () => {
    setSavingRotation(true)
    try {
      await popRepository.setRotation(pop.id, rotationDraft)
      // Rebuild local state to show updated order
      const userMap = Object.fromEntries(allStaff.map(u => [u.id, u]))
      setRotation(rotationDraft.map((userId, i) => {
        const existing = rotation.find(r => r.user_id === userId)
        return {
          id: existing?.id ?? '',
          pop_id: pop.id,
          user_id: userId,
          order_index: i,
          last_assigned_date: existing?.last_assigned_date ?? null,
          active: true,
          created_at: existing?.created_at ?? new Date().toISOString(),
          user: userMap[userId],
        } as POPStaffRotation
      }))
    } catch (err) {
      console.error(err)
    } finally {
      setSavingRotation(false)
    }
  }

  const totalSteps = blocks.reduce((sum, b) => sum + b.steps.length, 0)
  // Rodízio disponível para todos os profissionais operacionais (não admin/supervisor)
  const hasRotation = !['admin', 'supervisor'].includes(pop.role_type)

  // Next in rotation: whoever has oldest last_assigned_date (null = never = first)
  const nextInRotation = rotation.length > 0
    ? [...rotation].sort((a, b) => {
        if (!a.last_assigned_date) return -1
        if (!b.last_assigned_date) return 1
        return a.last_assigned_date.localeCompare(b.last_assigned_date)
      })[0]
    : null

  const staffInRotation = new Set(rotationDraft)
  // Só mostra profissionais com o mesmo role do POP para adicionar ao rodízio
  const staffAvailable = allStaff.filter(u => !staffInRotation.has(u.id) && u.role === pop.role_type)

  return (
    <div>
      <SectionHeader
        eyebrow={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/dashboard/pops" style={{ color: '#9C8E80', textDecoration: 'none', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
              ← Protocolos
            </Link>
          </span>
        }
        title={pop.name}
        sub={`${blocks.length} blocos · ${totalSteps} passos · ${assignedIds.size} residentes`}
        action={
          tab === 'passos' ? (
            <Btn variant="primary" size="sm" type="button" onClick={() => setBlockModal({ open: true })}>+ Novo bloco</Btn>
          ) : tab === 'residentes' ? (
            <div style={{ fontSize: 12, color: '#9C8E80' }}>
              {assignedIds.size} de {allResidents.length} residentes atribuídos
            </div>
          ) : null
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #F7F0E3', marginBottom: 20, gap: 0 }}>
        {([
          { id: 'passos',     label: `Passos (${totalSteps})` },
          { id: 'residentes', label: `Residentes (${assignedIds.size})` },
          ...(hasRotation ? [{ id: 'rodizio', label: `Rodízio (${rotation.length})` }] : []),
        ] as { id: Tab; label: string }[]).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-lato)', border: 'none', background: 'none',
              borderBottom: `2px solid ${tab === t.id ? '#B8864E' : 'transparent'}`,
              color: tab === t.id ? '#B8864E' : '#9C8E80',
              marginBottom: -2, transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: PASSOS ──────────────────────────────────────────────────────── */}
      {tab === 'passos' && (
        <>
          {blocks.length === 0 ? (
            <Card>
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>☰</div>
                <div style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 700, color: '#1C1C1C', marginBottom: 6 }}>Nenhum bloco criado</div>
                <div style={{ fontSize: 13, color: '#9C8E80', marginBottom: 20 }}>Blocos agrupam os passos do protocolo em etapas lógicas</div>
                <Btn variant="primary" size="md" type="button" onClick={() => setBlockModal({ open: true })}>+ Criar primeiro bloco</Btn>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {blocks.map((block, bi) => (
                <Card key={block.id}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #F7F0E3', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#B8864E', flexShrink: 0 }}>
                      {bi + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1C' }}>{block.name}</div>
                      <div style={{ fontSize: 11, color: '#9C8E80' }}>{block.steps.length} passo{block.steps.length !== 1 ? 's' : ''} · Tolerância: {block.tolerance_minutes ?? 15}min</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn variant="secondary" size="sm" type="button" onClick={() => setStepModal({ open: true, blockId: block.id })}>+ Passo</Btn>
                      <Btn variant="ghost" size="sm" type="button" onClick={() => setBlockModal({ open: true, block })}>Editar</Btn>
                    </div>
                  </div>

                  {block.steps.length === 0 ? (
                    <div style={{ padding: '20px', color: '#9C8E80', fontSize: 13, textAlign: 'center', fontStyle: 'italic' }}>
                      Nenhum passo. Clique em "+ Passo" para adicionar.
                    </div>
                  ) : block.steps.map((step, si) => (
                    <div
                      key={step.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 20px', borderBottom: si < block.steps.length - 1 ? '1px solid #F7F0E3' : 'none', cursor: 'pointer' }}
                      onClick={() => setStepModal({ open: true, blockId: block.id, step })}
                    >
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#9C8E80', flexShrink: 0 }}>
                        {si + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1C' }}>{step.title}</div>
                        {step.description && (
                          <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.description}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                        <Badge variant="muted">{STEP_ICONS[step.type]} {STEP_LABELS[step.type]}</Badge>
                        {step.is_mandatory && <Badge variant="gold">Obrigatório</Badge>}
                      </div>
                    </div>
                  ))}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB: RESIDENTES ──────────────────────────────────────────────────── */}
      {tab === 'residentes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {allResidents.length === 0 ? (
            <Card><EmptyState icon="◎" title="Nenhum residente cadastrado" sub="Cadastre residentes para atribuir este protocolo" /></Card>
          ) : (
            <>
              <div style={{ fontSize: 12, color: '#9C8E80', marginBottom: 4 }}>
                Marque os residentes que devem receber este protocolo. As alterações são salvas imediatamente.
              </div>
              <Card>
                {allResidents.map((r, i) => {
                  const isAssigned = assignedIds.has(r.id)
                  const isSaving   = savingAssign === r.id
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
                        borderBottom: i < allResidents.length - 1 ? '1px solid #F7F0E3' : 'none',
                        cursor: isSaving ? 'wait' : 'pointer',
                        background: isAssigned ? '#FDFAF5' : 'white',
                        transition: 'background 0.2s',
                      }}
                      onClick={() => !isSaving && toggleAssignment(r.id)}
                    >
                      {/* Checkbox visual */}
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${isAssigned ? '#B8864E' : '#EDE0C8'}`,
                        background: isAssigned ? '#B8864E' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {isAssigned && <span style={{ color: 'white', fontSize: 13, lineHeight: 1 }}>✓</span>}
                        {isSaving && <span style={{ color: isAssigned ? 'white' : '#B8864E', fontSize: 10 }}>…</span>}
                      </div>

                      {/* Avatar */}
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#B8864E', fontSize: 14, flexShrink: 0 }}>
                        {r.name.charAt(0)}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1C' }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: '#9C8E80' }}>
                          Quarto {r.room_number} · {DEP_LABELS[r.dependency_level]}
                          {r.is_bedridden && ' · Acamado'}
                        </div>
                      </div>

                      <Badge variant={isAssigned ? 'success' : 'muted'} dot>
                        {isAssigned ? 'Atribuído' : 'Não atribuído'}
                      </Badge>
                    </div>
                  )
                })}
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── TAB: RODÍZIO ─────────────────────────────────────────────────────── */}
      {tab === 'rodizio' && hasRotation && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Lista de rodízio */}
          <div>
            <div style={{ fontSize: 12, color: '#9C8E80', marginBottom: 12 }}>
              Define a ordem de rotação. O colaborador com a data de última execução mais antiga é o próximo da fila.
              Use as setas para reordenar. Salve quando terminar.
            </div>

            {nextInRotation && (
              <div style={{ background: '#FFF8EE', border: '1.5px solid #EDE0C8', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>🔄</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9C8E80' }}>Próximo na fila</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1C' }}>{nextInRotation.user?.name ?? '—'}</div>
                  <div style={{ fontSize: 11, color: '#9C8E80' }}>
                    {nextInRotation.last_assigned_date
                      ? `Última vez: ${new Date(nextInRotation.last_assigned_date + 'T12:00:00').toLocaleDateString('pt-BR')}`
                      : 'Nunca executou este protocolo'}
                  </div>
                </div>
              </div>
            )}

            <Card>
              {rotationDraft.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#9C8E80', fontSize: 13 }}>
                  Nenhum colaborador no rodízio. Adicione colaboradores da lista ao lado.
                </div>
              ) : (
                rotationDraft.map((userId, i) => {
                  const staff = allStaff.find(u => u.id === userId)
                  const rotEntry = rotation.find(r => r.user_id === userId)
                  if (!staff) return null
                  return (
                    <div
                      key={userId}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < rotationDraft.length - 1 ? '1px solid #F7F0E3' : 'none' }}
                    >
                      {/* Posição */}
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#B8864E' : '#F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: i === 0 ? 'white' : '#9C8E80', flexShrink: 0 }}>
                        {i + 1}
                      </div>

                      {/* Avatar */}
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#B8864E', fontSize: 13, flexShrink: 0 }}>
                        {staff.name.charAt(0)}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1C' }}>{staff.name}</div>
                        <div style={{ fontSize: 11, color: '#9C8E80' }}>
                          {rotEntry?.last_assigned_date
                            ? `Última vez: ${new Date(rotEntry.last_assigned_date + 'T12:00:00').toLocaleDateString('pt-BR')}`
                            : 'Nunca executou'}
                        </div>
                      </div>

                      {/* Controles */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button type="button" onClick={() => moveUp(i)} disabled={i === 0}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #EDE0C8', background: 'white', cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.3 : 1, fontSize: 13 }}>
                          ↑
                        </button>
                        <button type="button" onClick={() => moveDown(i)} disabled={i === rotationDraft.length - 1}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #EDE0C8', background: 'white', cursor: i === rotationDraft.length - 1 ? 'not-allowed' : 'pointer', opacity: i === rotationDraft.length - 1 ? 0.3 : 1, fontSize: 13 }}>
                          ↓
                        </button>
                        <button type="button" onClick={() => removeFromRotation(userId)}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #EDE0C8', background: 'white', cursor: 'pointer', fontSize: 13, color: '#EF4444' }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </Card>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <Btn variant="primary" size="md" type="button" onClick={saveRotation} disabled={savingRotation}>
                {savingRotation ? 'Salvando...' : 'Salvar rodízio'}
              </Btn>
            </div>
          </div>

          {/* Adicionar ao rodízio */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9C8E80', marginBottom: 10 }}>
              Colaboradores disponíveis
            </div>
            <Card>
              {staffAvailable.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#9C8E80' }}>
                  Todos os colaboradores já estão no rodízio.
                </div>
              ) : staffAvailable.map((u, i) => (
                <div
                  key={u.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: i < staffAvailable.length - 1 ? '1px solid #F7F0E3' : 'none', cursor: 'pointer' }}
                  onClick={() => addToRotation(u.id)}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#B8864E', fontSize: 13, flexShrink: 0 }}>
                    {u.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1C' }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: '#9C8E80' }}>{ROLE_LABELS[u.role] ?? u.role}</div>
                  </div>
                  <span style={{ color: '#B8864E', fontSize: 18, fontWeight: 700 }}>+</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* Modais de bloco e passo */}
      {blockModal.open && (
        <BlockModal
          popId={pop.id}
          block={blockModal.block}
          nextOrderIndex={blocks.length + 1}
          onClose={() => setBlockModal({ open: false })}
          onSaved={handleBlockSaved}
          onDeleted={blockModal.block ? handleBlockDeleted : undefined}
        />
      )}

      {stepModal.open && (
        <StepModal
          blockId={stepModal.blockId}
          step={stepModal.step}
          nextOrderIndex={(blocks.find(b => b.id === stepModal.blockId)?.steps.length ?? 0) + 1}
          onClose={() => setStepModal({ open: false, blockId: '' })}
          onSaved={s => handleStepSaved(stepModal.blockId, s)}
          onDeleted={stepModal.step ? id => handleStepDeleted(stepModal.blockId, id) : undefined}
        />
      )}
    </div>
  )
}
