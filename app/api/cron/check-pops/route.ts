import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Brazil time helpers (UTC-3)
function getBrazilNow() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000)
}

function getBrazilMinutes(d: Date) {
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

function getTodayBrazilStartUTC() {
  const br = getBrazilNow()
  // midnight Brazil in UTC = year/month/day at 03:00 UTC
  return new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate(), 3, 0, 0))
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

export async function GET(req: NextRequest) {
  // Security: verify Vercel cron secret
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const nowBrazil = getBrazilNow()
    const currentMinutes = getBrazilMinutes(nowBrazil)
    const todayStart = getTodayBrazilStartUTC()

    // ── 1. Load active POPs with time constraints ──────────────────────────
    const { data: pops } = await supabase
      .from('pops')
      .select('id, name, start_time_expected, deadline_time, tolerance_minutes')
      .eq('active', true)
      .not('start_time_expected', 'is', null)

    if (!pops || pops.length === 0) {
      return NextResponse.json({ checked: 0, created: 0, message: 'No timed POPs' })
    }

    // ── 2. Load active residents ───────────────────────────────────────────
    const { data: residents } = await supabase
      .from('residents')
      .select('id, name')
      .eq('active', true)

    if (!residents || residents.length === 0) {
      return NextResponse.json({ checked: 0, created: 0, message: 'No residents' })
    }

    // ── 3. Load today's executions ────────────────────────────────────────
    const { data: todayExecs } = await supabase
      .from('executions')
      .select('id, pop_id, resident_id, status')
      .gte('created_at', todayStart.toISOString())

    const execSet = new Set<string>((todayExecs ?? []).map(e => `${e.pop_id}:${e.resident_id}`))
    const inProgressExecs = (todayExecs ?? []).filter(e => e.status === 'in_progress')

    // ── 4. Load today's existing alerts (to avoid duplicates) ─────────────
    const { data: todayAlerts } = await supabase
      .from('alerts')
      .select('type, resident_id, message, execution_id')
      .gte('triggered_at', todayStart.toISOString())

    const alertKey = (type: string, residentId: string | null, execId: string | null) =>
      `${type}:${residentId ?? ''}:${execId ?? ''}`

    const existingAlerts = new Set<string>(
      (todayAlerts ?? []).map(a => alertKey(a.type, a.resident_id, a.execution_id))
    )

    const toInsert: {
      type: string
      resident_id: string | null
      execution_id: string | null
      severity: string
      message: string
      triggered_at: string
    }[] = []

    const now = new Date().toISOString()

    // ── 5. Check pop_not_started: POP is past expected time + tolerance ────
    for (const pop of pops) {
      const expectedMin = parseTimeToMinutes(pop.start_time_expected)
      const deadlineMin = expectedMin + (pop.tolerance_minutes ?? 0)

      if (currentMinutes < deadlineMin) continue // not late yet

      for (const resident of residents) {
        const key = `${pop.id}:${resident.id}`
        if (execSet.has(key)) continue // already has an execution today

        const ak = alertKey('pop_not_started', resident.id, null)
        // Deduplicate by pop name in the message
        const alreadyExists = (todayAlerts ?? []).some(
          a => a.type === 'pop_not_started' &&
               a.resident_id === resident.id &&
               a.message.includes(pop.name)
        )
        if (alreadyExists) continue

        const overMin = currentMinutes - deadlineMin
        const severity = overMin > 60 ? 'critical' : overMin > 30 ? 'high' : 'medium'

        toInsert.push({
          type: 'pop_not_started',
          resident_id: resident.id,
          execution_id: null,
          severity,
          message: `POP não iniciado: ${pop.name} — ${resident.name} (${overMin} min de atraso)`,
          triggered_at: now,
        })
      }
    }

    // ── 6. Check step_late: execution in_progress past deadline ──────────
    if (inProgressExecs.length > 0) {
      // Get POP deadline times for these executions
      const popIds = [...new Set(inProgressExecs.map(e => e.pop_id))]
      const { data: popDetails } = await supabase
        .from('pops')
        .select('id, name, deadline_time, tolerance_minutes')
        .in('id', popIds)
        .not('deadline_time', 'is', null)

      const popMap = new Map((popDetails ?? []).map(p => [p.id, p]))
      const residentMap = new Map(residents.map(r => [r.id, r]))

      for (const exec of inProgressExecs) {
        const pop = popMap.get(exec.pop_id)
        if (!pop) continue

        const deadlineMin = parseTimeToMinutes(pop.deadline_time) + (pop.tolerance_minutes ?? 0)
        if (currentMinutes < deadlineMin) continue

        const alreadyExists = (todayAlerts ?? []).some(
          a => a.type === 'step_late' && a.execution_id === exec.id
        )
        if (alreadyExists) continue

        const overMin = currentMinutes - deadlineMin
        const resident = residentMap.get(exec.resident_id)
        const severity = overMin > 60 ? 'critical' : 'high'

        toInsert.push({
          type: 'step_late',
          resident_id: exec.resident_id,
          execution_id: exec.id,
          severity,
          message: `Execução atrasada: ${pop.name} — ${resident?.name ?? 'Residente'} (${overMin} min após prazo)`,
          triggered_at: now,
        })
      }
    }

    // ── 7. Batch insert new alerts ────────────────────────────────────────
    if (toInsert.length > 0) {
      await supabase.from('alerts').insert(toInsert)
    }

    return NextResponse.json({
      checked: pops.length * residents.length + inProgressExecs.length,
      created: toInsert.length,
      brazilTime: `${nowBrazil.getUTCHours().toString().padStart(2,'0')}:${nowBrazil.getUTCMinutes().toString().padStart(2,'0')}`,
    })
  } catch (err) {
    console.error('[cron/check-pops] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
