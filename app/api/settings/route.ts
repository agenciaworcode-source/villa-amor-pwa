import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Retorna settings públicas de geofence e câmera para componentes client-side
export async function GET() {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await admin.from('system_settings').select('key, value')
  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.key] = row.value

  return NextResponse.json({
    geofence_enabled:         map.geofence_enabled         ?? 'true',
    geofence_lat:             map.geofence_lat             ?? '0',
    geofence_lng:             map.geofence_lng             ?? '0',
    geofence_radius_m:        map.geofence_radius_m        ?? '100',
    camera_allow_gallery:     map.camera_allow_gallery     ?? 'false',
    camera_max_video_seconds: map.camera_max_video_seconds ?? '30',
  })
}
