'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { residentRepository } from '@/services/repositories/resident-repository'
import { popRepository } from '@/services/repositories/pop-repository'
import { executionRepository } from '@/services/repositories/execution-repository'
import { storageService } from '@/services/storage-service'
import { CameraModal } from '@/components/mobile/camera-modal'
import { GeofenceGate } from '@/components/mobile/geofence-gate'
import { useAuthStore } from '@/store/auth-store'
import { useUIStore } from '@/store/ui-store'
import { Resident, POP, POPBlock, POPStep, Execution, ExecutionStep } from '@/types'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(startIso: string, endIso: string) {
  const diff = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
  if (diff < 1) return '< 1 min'
  return `${diff} min`
}

// ─── per-step runtime state ────────────────────────────────────────────────────

type StepRunState = {
  dbId: string | null          // execution_steps.id  (null = ainda não iniciado)
  status: 'pending' | 'in_progress' | 'completed'
  startedAt: string | null     // created_at do execution_step  →  check-in
  completedAt: string | null   // completed_at                  →  check-out
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ExecutionPage() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const { user }     = useAuthStore()
  const { toast }    = useUIStore()

  const [loading,   setLoading]   = useState(true)
  const [busy,      setBusy]      = useState(false)       // qualquer operação assíncrona
  const [resident,  setResident]  = useState<Resident | null>(null)
  const [pop,       setPop]       = useState<(POP & { blocks: (POPBlock & { steps: POPStep[] })[] }) | null>(null)
  const [execution, setExecution] = useState<Execution | null>(null)
  const [stepMap,   setStepMap]   = useState<Record<string, StepRunState>>({})  // pop_step_id → state
  const [cameraFor, setCameraFor] = useState<{ stepId: string; type: 'photo' | 'video' } | null>(null)

  // ── índice global do passo ativo ────────────────────────────────────────────
  const allSteps = useMemo(() => {
    if (!pop) return [] as POPStep[]
    return pop.blocks.flatMap(b => b.steps)
  }, [pop])

  const activeStepId = useMemo(() => {
    for (const step of allSteps) {
      const s = stepMap[step.id]
      if (!s || s.status !== 'completed') return step.id
    }
    return null  // tudo concluído
  }, [allSteps, stepMap])

  const completedCount = useMemo(
    () => Object.values(stepMap).filter(s => s.status === 'completed').length,
    [stepMap]
  )

  // ── inicialização ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      if (!user) return
      const executionId = params.id as string
      let residentId    = searchParams.get('residentId')
      let popId         = searchParams.get('popId')

      try {
        let currentExec: Execution | null = null

        if (executionId === 'new') {
          if (!residentId || !popId) { router.push('/home'); return }

          const existing = await executionRepository.findTodayExecution(popId, residentId, user.id)
          currentExec = existing ?? await executionRepository.create({
            pop_id: popId, resident_id: residentId, user_id: user.id, status: 'in_progress'
          })

          if (!existing) {
            try { await popRepository.advanceRotation(popId, user.id) } catch { /* ignora */ }
          }
        } else {
          currentExec = await executionRepository.findById(executionId)
          if (!currentExec) { router.push('/home'); return }
          residentId = currentExec.resident_id
          popId      = currentExec.pop_id
        }

        const [resData, popData] = await Promise.all([
          residentRepository.findById(residentId!),
          popRepository.findByIdWithDetails(popId!),
        ])
        if (!resData || !popData) { router.push('/home'); return }

        setResident(resData)
        setPop(popData)
        setExecution(currentExec)

        // monta o mapa de estados a partir dos passos já registrados
        const initial: Record<string, StepRunState> = {}
        for (const dbStep of (currentExec.steps ?? []) as ExecutionStep[]) {
          initial[dbStep.pop_step_id] = {
            dbId:        dbStep.id,
            status:      dbStep.status as 'pending' | 'in_progress' | 'completed',
            startedAt:   dbStep.created_at,
            completedAt: dbStep.completed_at,
          }
        }
        setStepMap(initial)

        // se já estava concluída hoje, avisa e vai embora
        const allStepsFlat = popData.blocks.flatMap(b => b.steps)
        const doneCount    = Object.values(initial).filter(s => s.status === 'completed').length
        if (currentExec.status === 'completed' || doneCount >= allStepsFlat.length) {
          toast('Protocolo já concluído hoje!', 'success')
          router.push('/home')
          return
        }

        setLoading(false)
      } catch (err) {
        console.error('Erro ao iniciar execução:', err)
        router.push('/home')
      }
    }
    init()
  }, [user, params.id, searchParams, router])

  // ── check-in (Iniciar) ──────────────────────────────────────────────────────
  const handleCheckin = useCallback(async (stepId: string) => {
    if (!execution || busy) return
    setBusy(true)
    try {
      const dbStep = await executionRepository.addStep({
        execution_id: execution.id,
        pop_step_id:  stepId,
        status:       'in_progress',
        completed_at: null,
      })
      setStepMap(prev => ({
        ...prev,
        [stepId]: {
          dbId:        dbStep.id,
          status:      'in_progress',
          startedAt:   dbStep.created_at,
          completedAt: null,
        },
      }))
    } catch {
      toast('Erro ao registrar início. Tente novamente.', 'error')
    } finally {
      setBusy(false)
    }
  }, [execution, busy, toast])

  // ── check-out (Finalizar) para checkbox ────────────────────────────────────
  const handleCheckout = useCallback(async (stepId: string) => {
    if (!execution || busy) return
    const run = stepMap[stepId]
    if (!run?.dbId) return
    setBusy(true)
    try {
      const now = new Date().toISOString()
      await executionRepository.updateStep(run.dbId, { status: 'completed', completed_at: now })
      setStepMap(prev => ({ ...prev, [stepId]: { ...prev[stepId], status: 'completed', completedAt: now } }))

      // verifica se acabou tudo
      const newDone = Object.values({ ...stepMap, [stepId]: { ...stepMap[stepId], status: 'completed' } })
        .filter(s => s.status === 'completed').length
      if (newDone >= allSteps.length) {
        await executionRepository.updateStatus(execution.id, 'completed')
        toast('Protocolo concluído com sucesso! ✓', 'success')
        router.push('/home')
      }
    } catch {
      toast('Erro ao finalizar passo. Tente novamente.', 'error')
    } finally {
      setBusy(false)
    }
  }, [execution, busy, stepMap, allSteps.length, toast, router])

  // ── captura de foto/vídeo ───────────────────────────────────────────────────
  const handleCapture = useCallback(async (blob: Blob) => {
    if (!execution || !cameraFor) return
    const { stepId, type } = cameraFor
    const run = stepMap[stepId]
    if (!run?.dbId) return
    setBusy(true)
    try {
      const now  = new Date().toISOString()
      const path = await storageService.uploadExecutionMedia(execution.id, stepId, blob, type)
      await executionRepository.addMedia({ execution_step_id: run.dbId, type, storage_path: path })
      await executionRepository.updateStep(run.dbId, { status: 'completed', completed_at: now })
      setStepMap(prev => ({ ...prev, [stepId]: { ...prev[stepId], status: 'completed', completedAt: now } }))
      setCameraFor(null)

      const newDone = Object.values({ ...stepMap, [stepId]: { ...stepMap[stepId], status: 'completed' } })
        .filter(s => s.status === 'completed').length
      if (newDone >= allSteps.length) {
        await executionRepository.updateStatus(execution.id, 'completed')
        toast('Protocolo concluído com sucesso! ✓', 'success')
        router.push('/home')
      }
    } catch {
      toast('Erro ao salvar evidência. Tente novamente.', 'error')
    } finally {
      setBusy(false)
    }
  }, [execution, cameraFor, stepMap, allSteps.length, toast, router])

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-serif text-dark-800">Carregando protocolo...</p>
      </div>
    )
  }
  if (!resident || !pop || !execution) return null

  return (
    <GeofenceGate>
      <div className="flex flex-col h-full bg-cream-50 overflow-hidden">

        {/* ── cabeçalho ── */}
        <header className="bg-white px-4 py-3 border-b border-cream-200 flex items-center gap-3 shrink-0">
          <button onClick={() => router.back()} className="text-2xl text-dark-800 leading-none">←</button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-dark-800 text-sm leading-tight truncate">{resident.name}</h1>
            <p className="text-[10px] text-gold-500 font-bold uppercase tracking-wider truncate">{pop.name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-bold tabular-nums text-dark-800">{completedCount}/{allSteps.length}</p>
            <p className="text-[10px] text-dark-700/40">tarefas</p>
          </div>
        </header>

        {/* ── barra de progresso ── */}
        <div className="bg-white px-4 pb-2 shrink-0">
          <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold-400 rounded-full transition-all duration-700"
              style={{ width: `${allSteps.length > 0 ? (completedCount / allSteps.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* ── trilha de tarefas ── */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {pop.blocks.map((block) => (
            <BlockSection
              key={block.id}
              block={block}
              stepMap={stepMap}
              activeStepId={activeStepId}
              busy={busy}
              onCheckin={handleCheckin}
              onCheckout={handleCheckout}
              onOpenCamera={(stepId, type) => setCameraFor({ stepId, type })}
            />
          ))}

          {/* espaço extra para não ficar colado no fim */}
          <div className="h-4" />
        </main>
      </div>

      {cameraFor && (
        <CameraModal
          type={cameraFor.type}
          onCapture={handleCapture}
          onClose={() => setCameraFor(null)}
        />
      )}
    </GeofenceGate>
  )
}

// ─── sub-componente: bloco ─────────────────────────────────────────────────────

function BlockSection({
  block,
  stepMap,
  activeStepId,
  busy,
  onCheckin,
  onCheckout,
  onOpenCamera,
}: {
  block: POPBlock & { steps: POPStep[] }
  stepMap: Record<string, StepRunState>
  activeStepId: string | null
  busy: boolean
  onCheckin: (stepId: string) => void
  onCheckout: (stepId: string) => void
  onOpenCamera: (stepId: string, type: 'photo' | 'video') => void
}) {
  const completedInBlock = block.steps.filter(s => stepMap[s.id]?.status === 'completed').length
  const allDone          = completedInBlock === block.steps.length

  return (
    <section>
      {/* cabeçalho do bloco */}
      <div className={`flex items-center justify-between mb-3 px-1 ${allDone ? 'opacity-60' : ''}`}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gold-500">Bloco</p>
          <h2 className="font-bold text-dark-800 text-base leading-tight">{block.name}</h2>
          {(block.start_time_expected || block.deadline_time) && (
            <p className="text-[11px] text-dark-700/50 mt-0.5 font-mono">
              {block.start_time_expected && `⏰ ${block.start_time_expected}`}
              {block.start_time_expected && block.deadline_time && ' → '}
              {block.deadline_time && block.deadline_time}
              {block.tolerance_minutes > 0 && ` (±${block.tolerance_minutes} min)`}
            </p>
          )}
        </div>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          allDone ? 'bg-green-100 text-green-600' : 'bg-cream-200 text-dark-700/60'
        }`}>
          {allDone ? '✓' : `${completedInBlock}/${block.steps.length}`}
        </div>
      </div>

      {/* cartões de passo */}
      <div className="space-y-2">
        {block.steps.map((step, idx) => (
          <StepCard
            key={step.id}
            step={step}
            index={idx}
            run={stepMap[step.id] ?? { dbId: null, status: 'pending', startedAt: null, completedAt: null }}
            isActive={activeStepId === step.id}
            busy={busy}
            onCheckin={onCheckin}
            onCheckout={onCheckout}
            onOpenCamera={onOpenCamera}
          />
        ))}
      </div>
    </section>
  )
}

// ─── sub-componente: cartão de passo ─────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  photo:       '📸',
  video:       '🎥',
  checkbox:    '✅',
  conditional: '🔀',
  timed:       '⏱️',
}

function StepCard({
  step,
  index,
  run,
  isActive,
  busy,
  onCheckin,
  onCheckout,
  onOpenCamera,
}: {
  step: POPStep
  index: number
  run: StepRunState
  isActive: boolean
  busy: boolean
  onCheckin: (id: string) => void
  onCheckout: (id: string) => void
  onOpenCamera: (id: string, type: 'photo' | 'video') => void
}) {
  const isCompleted   = run.status === 'completed'
  const isInProgress  = run.status === 'in_progress'
  const isPending     = run.status === 'pending'
  const isLocked      = isPending && !isActive

  return (
    <div
      className={`
        rounded-2xl border p-4 transition-all duration-300
        ${isCompleted   ? 'bg-green-50  border-green-200 opacity-80'   : ''}
        ${isInProgress  ? 'bg-gold-50   border-gold-300  shadow-md'    : ''}
        ${isActive && isPending ? 'bg-white border-gold-200 shadow-sm' : ''}
        ${isLocked      ? 'bg-white     border-cream-200 opacity-50'   : ''}
      `}
    >
      {/* linha superior */}
      <div className="flex items-start gap-3">
        {/* ícone de status */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5
          ${isCompleted  ? 'bg-green-100 text-green-600'  : ''}
          ${isInProgress ? 'bg-gold-100  text-gold-600'   : ''}
          ${isPending    ? 'bg-cream-100 text-dark-700/40' : ''}
        `}>
          {isCompleted  ? '✓'                   : ''}
          {isInProgress ? '▶'                   : ''}
          {isPending    ? `${index + 1}`         : ''}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">{TYPE_ICON[step.type] ?? '📋'}</span>
            <p className={`font-bold text-sm leading-tight ${isLocked ? 'text-dark-700/40' : 'text-dark-800'}`}>
              {step.title}
            </p>
          </div>
          {step.description && (
            <p className="text-xs text-dark-700/50 mt-1 leading-relaxed">{step.description}</p>
          )}
          {step.has_time_limit && step.step_deadline_minutes && (
            <p className="text-[10px] text-gold-500 font-bold mt-1">
              ⏱ Prazo: {step.step_deadline_minutes} min
            </p>
          )}
        </div>
      </div>

      {/* timestamps ── aparece quando iniciado ou concluído */}
      {(isInProgress || isCompleted) && (
        <div className={`mt-3 pt-3 border-t flex gap-4 text-xs font-mono ${
          isCompleted ? 'border-green-200' : 'border-gold-200'
        }`}>
          <div>
            <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-dark-700/40 mb-0.5">
              Check-in
            </p>
            <p className={`font-bold ${isCompleted ? 'text-green-700' : 'text-gold-600'}`}>
              {run.startedAt ? fmtTime(run.startedAt) : '—'}
            </p>
          </div>
          {isCompleted && run.completedAt && (
            <>
              <div>
                <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-dark-700/40 mb-0.5">
                  Check-out
                </p>
                <p className="font-bold text-green-700">{fmtTime(run.completedAt)}</p>
              </div>
              <div>
                <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-dark-700/40 mb-0.5">
                  Duração
                </p>
                <p className="font-bold text-dark-700/60">
                  {run.startedAt ? fmtDuration(run.startedAt, run.completedAt) : '—'}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* botões de ação */}
      {isActive && isPending && (
        <div className="mt-4">
          <button
            disabled={busy}
            onClick={() => onCheckin(step.id)}
            className="w-full h-11 bg-gold-400 disabled:bg-cream-300 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <span>▶</span> INICIAR TAREFA
          </button>
        </div>
      )}

      {isInProgress && (
        <div className="mt-4 space-y-2">
          {(step.type === 'photo' || step.type === 'video') && (
            <button
              disabled={busy}
              onClick={() => onOpenCamera(step.id, step.type as 'photo' | 'video')}
              className="w-full h-11 bg-dark-800 disabled:bg-cream-300 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {step.type === 'photo' ? '📸' : '🎥'} CAPTURAR EVIDÊNCIA
            </button>
          )}
          {step.type === 'checkbox' && (
            <button
              disabled={busy}
              onClick={() => onCheckout(step.id)}
              className="w-full h-11 bg-green-500 disabled:bg-cream-300 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span>✓</span> FINALIZAR TAREFA (CHECK-OUT)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
