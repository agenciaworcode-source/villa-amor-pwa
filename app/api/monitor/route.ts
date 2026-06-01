import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}

export async function POST(request: NextRequest) {
  const monitorKey = request.headers.get('x-monitor-key')
  if (!monitorKey || monitorKey !== process.env.MONITOR_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase.rpc('check_late_executions')

  if (error) {
    console.error('[monitor] check_late_executions error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}

// Allow GET for simple cron pings that also supply the header
export async function GET(request: NextRequest) {
  return POST(request)
}
