'use client'

import { useState, useEffect } from 'react'
import { offlineExecutionService } from '@/services/offline-execution-service'

export function useNetwork() {
  const [online, setOnline] = useState(true)
  const [pendingSync, setPendingSync] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    setOnline(navigator.onLine)

    const handleOnline = async () => {
      setOnline(true)
      const count = await offlineExecutionService.getPendingCount()
      if (count > 0) {
        setSyncing(true)
        await offlineExecutionService.syncAll()
        setSyncing(false)
        setPendingSync(0)
      }
    }

    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check pending on mount
    offlineExecutionService.getPendingCount().then(setPendingSync)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { online, pendingSync, syncing }
}
