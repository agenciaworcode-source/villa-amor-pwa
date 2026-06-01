'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { residentRepository } from '@/services/repositories/resident-repository'
import { popRepository } from '@/services/repositories/pop-repository'
import { executionRepository } from '@/services/repositories/execution-repository'
import { storageService } from '@/services/storage-service'
import { CameraModal } from '@/components/mobile/camera-modal'
import { GeofenceGate } from '@/components/mobile/geofence-gate'
import { useAuthStore } from '@/store/auth-store'
import { useUIStore } from '@/store/ui-store'
import { Resident, POP, POPBlock, POPStep, Execution } from '@/types'

export default function ExecutionPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const { toast } = useUIStore()

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [resident, setResident] = useState<Resident | null>(null)
  const [pop, setPop] = useState<(POP & { blocks: (POPBlock & { steps: POPStep[] })[] }) | null>(null)
  const [execution, setExecution] = useState<Execution | null>(null)
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [showCamera, setShowCamera] = useState(false)

  const allSteps = useMemo(() => {
    if (!pop) return []
    return pop.blocks.flatMap(b => b.steps)
  }, [pop])

  const currentStepGlobalIndex = useMemo(() => {
    if (!pop) return 0
    let count = 0
    for (let i = 0; i < currentBlockIndex; i++) {
      count += pop.blocks[i].steps.length
    }
    return count + currentStepIndex
  }, [pop, currentBlockIndex, currentStepIndex])

  useEffect(() => {
    async function init() {
      if (!user) return

      const executionId = params.id as string
      let residentId = searchParams.get('residentId')
      let popId = searchParams.get('popId')
      
      try {
        let currentExec: Execution | null = null

        if (executionId === 'new') {
          if (!residentId || !popId) {
            router.push('/home')
            return
          }
          // Criar nova
          currentExec = await executionRepository.create({
            pop_id: popId,
            resident_id: residentId,
            user_id: user.id,
            status: 'in_progress'
          })

          // Avança o rodízio para registrar que este colaborador ficou com este POP hoje
          try {
            await popRepository.advanceRotation(popId, user.id)
          } catch {
            // Não bloquear o fluxo se o rodízio falhar
          }
        } else {
          // Carregar existente
          currentExec = await executionRepository.findById(executionId)
          if (!currentExec) {
            router.push('/home')
            return
          }
          residentId = currentExec.resident_id
          popId = currentExec.pop_id
        }

        const [resData, popData] = await Promise.all([
          residentRepository.findById(residentId),
          popRepository.findByIdWithDetails(popId)
        ])

        if (!resData || !popData) {
          router.push('/home')
          return
        }

        setResident(resData)
        setPop(popData)
        setExecution(currentExec)

        // Determinar em qual passo estamos (se for retomada)
        if (executionId !== 'new' && currentExec.steps) {
            const completedStepIds = new Set(currentExec.steps.map(s => s.pop_step_id))
            let found = false
            for (let b = 0; b < popData.blocks.length; b++) {
                for (let s = 0; s < popData.blocks[b].steps.length; s++) {
                    if (!completedStepIds.has(popData.blocks[b].steps[s].id)) {
                        setCurrentBlockIndex(b)
                        setCurrentStepIndex(s)
                        found = true
                        break
                    }
                }
                if (found) break
            }
        }

        setLoading(false)
      } catch (error) {
        console.error('Erro na execução:', error)
        router.push('/home')
      }
    }

    init()
  }, [user, params.id, searchParams, router])

  const handleCapture = async (blob: Blob) => {
    if (!execution || !pop) return
    
    setUploading(true)
    const currentStep = pop.blocks[currentBlockIndex].steps[currentStepIndex]
    
    try {
      const path = await storageService.uploadExecutionMedia(
        execution.id,
        currentStep.id,
        blob,
        currentStep.type as 'photo' | 'video'
      )

      const stepExec = await executionRepository.addStep({
        execution_id: execution.id,
        pop_step_id: currentStep.id,
        status: 'completed',
        completed_at: new Date().toISOString()
      })

      await executionRepository.addMedia({
        execution_step_id: stepExec.id,
        type: currentStep.type as 'photo' | 'video',
        storage_path: path
      })

      setShowCamera(false)
      nextStep()
    } catch (err) {
      toast('Erro ao salvar evidência. Tente novamente.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const nextStep = () => {
    const currentBlock = pop!.blocks[currentBlockIndex]
    if (currentStepIndex < currentBlock.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else if (currentBlockIndex < pop!.blocks.length - 1) {
      setCurrentBlockIndex(currentBlockIndex + 1)
      setCurrentStepIndex(0)
    } else {
      executionRepository.updateStatus(execution!.id, 'completed')
      toast('Protocolo concluído com sucesso!', 'success')
      router.push('/home')
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-serif text-dark-800">Iniciando protocolo...</p>
      </div>
    )
  }

  if (!resident || !pop || !execution) return null

  const currentBlock = pop.blocks[currentBlockIndex]
  const currentStep = currentBlock.steps[currentStepIndex]

  return (
    <GeofenceGate>
    <div className="flex flex-col h-full bg-cream-50 overflow-hidden">
      <header className="bg-white p-4 border-b border-cream-200 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-2xl text-dark-800">←</button>
        <div className="flex-1">
          <h1 className="font-bold text-dark-800 leading-tight line-clamp-1">{resident.name}</h1>
          <p className="text-[10px] text-gold-400 font-bold uppercase tracking-wider">{pop.name}</p>
        </div>
      </header>

      <div className="bg-white px-4 py-3 border-b border-cream-100 flex gap-1.5">
        {allSteps.map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              i < currentStepGlobalIndex ? 'bg-gold-400' : 
              i === currentStepGlobalIndex ? 'bg-gold-300 animate-pulse scale-y-125' : 'bg-cream-200'
            }`}
          />
        ))}
      </div>

      <main className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-8 overflow-y-auto">
        <div className="space-y-3 max-w-sm">
          <div className="inline-block px-3 py-1 bg-cream-200 rounded-full">
            <span className="text-[10px] font-bold text-dark-700/60 uppercase tracking-widest">
              {currentBlock.name}
            </span>
          </div>
          <h2 className="text-3xl font-serif text-dark-800 leading-tight">
            {currentStep.title}
          </h2>
          {currentStep.description && (
            <p className="text-sm text-dark-700/60 leading-relaxed italic">
              {currentStep.description}
            </p>
          )}
        </div>

        <div className="w-full max-w-sm aspect-square bg-white rounded-[40px] border-2 border-dashed border-cream-200 flex flex-col items-center justify-center p-8 space-y-4 shadow-sm">
          {uploading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-gold-600 font-bold animate-bounce">Processando...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              <div className="w-24 h-24 bg-cream-50 rounded-full flex items-center justify-center text-5xl shadow-inner">
                {currentStep.type === 'photo' && '📸'}
                {currentStep.type === 'video' && '🎥'}
                {currentStep.type === 'checkbox' && '✅'}
              </div>
              <div className="space-y-1">
                <p className="text-dark-800 font-bold">
                  {currentStep.type === 'checkbox' ? 'Tarefa Realizada?' : 'Evidência Necessária'}
                </p>
                <p className="text-xs text-dark-700/40 max-w-[200px]">
                  {currentStep.type === 'checkbox' 
                    ? 'Confirme que completou esta etapa do protocolo.' 
                    : 'A câmera será aberta para captura obrigatória.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="p-6 bg-white border-t border-cream-200">
        <button 
          disabled={uploading}
          className="w-full h-[58px] bg-gold-400 disabled:bg-cream-300 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3"
          onClick={() => {
            if (currentStep.type === 'checkbox') {
              nextStep()
            } else {
              setShowCamera(true)
            }
          }}
        >
          {currentStep.type === 'checkbox' ? (
            <>PRÓXIMO PASSO <span className="text-xl">→</span></>
          ) : (
            <>ABRIR CÂMERA <span className="text-xl">📷</span></>
          )}
        </button>
      </footer>

      {showCamera && (
        <CameraModal 
          type={currentStep.type as 'photo' | 'video'} 
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
    </GeofenceGate>
  )
}
