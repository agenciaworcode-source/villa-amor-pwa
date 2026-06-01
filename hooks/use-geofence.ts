'use client'

import { useState, useEffect } from 'react'

const TARGET_LAT = Number(process.env.NEXT_PUBLIC_GEOFENCE_LAT ?? '0')
const TARGET_LNG = Number(process.env.NEXT_PUBLIC_GEOFENCE_LNG ?? '0')
const RADIUS_M = Number(process.env.NEXT_PUBLIC_GEOFENCE_RADIUS ?? '100')

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
  const [status, setStatus] = useState<GeofenceStatus>('checking')
  const [distanceM, setDistanceM] = useState<number | null>(null)

  useEffect(() => {
    // Skip check when no coordinates are configured (local dev without env vars)
    if (!TARGET_LAT || !TARGET_LNG) {
      setStatus('disabled')
      return
    }

    if (!navigator?.geolocation) {
      setStatus('error')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineMeters(pos.coords.latitude, pos.coords.longitude, TARGET_LAT, TARGET_LNG)
        setDistanceM(Math.round(dist))
        setStatus(dist <= RADIUS_M ? 'inside' : 'outside')
      },
      () => setStatus('error'),
      { timeout: 10_000, enableHighAccuracy: true, maximumAge: 30_000 },
    )
  }, [])

  return { status, distanceM, radiusM: RADIUS_M }
}
