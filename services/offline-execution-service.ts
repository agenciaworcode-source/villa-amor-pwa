'use client'

import { offlineDb, OfflineExecution, OfflineExecutionStep } from '@/lib/offline-db'
import { executionRepository } from '@/services/repositories/execution-repository'
import { storageService } from '@/services/storage-service'

export const offlineExecutionService = {
  async queueExecution(data: Omit<OfflineExecution, 'localId' | 'synced'>): Promise<number> {
    return offlineDb.executions.add({ ...data, synced: false })
  },

  async queueStep(data: Omit<OfflineExecutionStep, 'localId' | 'synced'>): Promise<void> {
    await offlineDb.steps.add({ ...data, synced: false })
  },

  async completeExecution(localId: number): Promise<void> {
    await offlineDb.executions.update(localId, { status: 'completed' })
  },

  async getPendingCount(): Promise<number> {
    return offlineDb.executions.where('synced').equals(0).count()
  },

  async syncAll(): Promise<{ synced: number; failed: number }> {
    const pending = await offlineDb.executions.where('synced').equals(0).toArray()
    let synced = 0
    let failed = 0

    for (const exec of pending) {
      try {
        const remote = await executionRepository.create({
          pop_id: exec.pop_id,
          resident_id: exec.resident_id,
          user_id: exec.user_id,
          status: exec.status,
        })

        const steps = await offlineDb.steps
          .where('localExecutionId').equals(exec.localId!)
          .toArray()

        for (const step of steps) {
          const stepRecord = await executionRepository.addStep({
            execution_id: remote.id,
            pop_step_id: step.pop_step_id,
            status: step.status,
            completed_at: step.completed_at,
          })

          if (step.mediaBlob && step.mediaType) {
            try {
              const path = await storageService.uploadExecutionMedia(
                remote.id,
                step.pop_step_id,
                step.mediaBlob,
                step.mediaType,
              )
              await executionRepository.addMedia({
                execution_step_id: stepRecord.id,
                type: step.mediaType,
                storage_path: path,
              })
            } catch {
              // Media upload failure is non-blocking — log and continue
              console.warn('Offline sync: media upload failed for step', step.pop_step_id)
            }
          }

          await offlineDb.steps.update(step.localId!, { synced: true })
        }

        if (exec.status === 'completed') {
          await executionRepository.updateStatus(remote.id, 'completed')
        }

        await offlineDb.executions.update(exec.localId!, { synced: true, remoteId: remote.id })
        synced++
      } catch (err) {
        console.error('Offline sync failed for execution', exec.localId, err)
        failed++
      }
    }

    return { synced, failed }
  },
}
