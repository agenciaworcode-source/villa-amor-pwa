import Dexie, { type Table } from 'dexie'

export interface OfflineExecution {
  localId?: number
  pop_id: string
  resident_id: string
  user_id: string
  started_at: string
  status: 'in_progress' | 'completed'
  synced: boolean
  remoteId?: string
}

export interface OfflineExecutionStep {
  localId?: number
  localExecutionId: number
  pop_step_id: string
  status: 'completed' | 'skipped'
  completed_at: string
  mediaBlob?: Blob
  mediaType?: 'photo' | 'video'
  synced: boolean
}

class OfflineDatabase extends Dexie {
  executions!: Table<OfflineExecution>
  steps!: Table<OfflineExecutionStep>

  constructor() {
    super('villa-amor-offline')
    this.version(1).stores({
      executions: '++localId, synced, resident_id, pop_id',
      steps: '++localId, localExecutionId, synced',
    })
  }
}

export const offlineDb = new OfflineDatabase()
