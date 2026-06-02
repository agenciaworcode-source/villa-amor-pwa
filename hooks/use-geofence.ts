'use client'

import { useState, useEffect } from 'react'

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export type GeofenceStatus = 'checking' | 'inside' | 'outside' | 'error' | 'disabled'

export interface GeofenceResult {
  status: GeofenceStatus
  distanceM: number | null
  radiusM: number
}

export function useGeofence(): GeofenceResult {
  const [status, setStatus]     = useState<GeofenceStatus>('checking')
  const [distanceM, setDistanceM] = useState<number | null>(null)
  const [radiusM, setRadiusM]   = useState(100)

  useEffect(() => {
    let cancelled = false

    async function run() {
      // Busca configurações do banco via API route
      let lat = 0, lng = 0, radius = 100, enabled = true
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const cfg = await res.json()
          lat     = Number(cfg.geofence_lat)
          lng     = Number(cfg.geofence_lng)
          radius  = Number(cfg.geofence_radius_m)
          enabled = cfg.geofence_enabled === 'true'
        }
      } catch {
        // fallback para env vars se API falhar
        lat     = Number(process.env.NEXT_PUBLIC_GEOFENCE_LAT ?? '0')
        lng     = Number(process.env.NEXT_PUBLIC_GEOFENCE_LNG ?? '0')
        radius  = Number(process.env.NEXT_PUBLIC_GEOFENCE_RADIUS ?? '100')
      }

      if (cancelled) return
      setRadiusM(radius)

      if (!enabled || (!lat && !lng)) {
        setStatus('disabled')
        return
      }

      if (!navigator?.geolocation) {
        setStatus('error')
        return
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return
          const dist = haversineMeters(pos.coords.latitude, pos.coords.longitude, lat, lng)
          setDistanceM(Math.round(dist))
          setStatus(dist <= radius ? 'inside' : 'outside')
        },
        () => { if (!cancelled) setStatus('error') },
        { timeout: 10_000, enableHighAccuracy: true, maximumAge: 30_000 },
      )
    }

    run()
    return () => { cancelled = true }
  }, [])

  return { status, distanceM, radiusM }
}
