import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getSessionUser() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET /api/pop-approvals?status=pending — lista aprovações (admin/supervisor)
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const status = req.nextUrl.searchParams.get('status') ?? 'pending'
    const admin = adminClient()

    const { data, error } = await admin
      .from('pop_late_approvals')
      .select('*, pop:pops(id, name, shift_type), user:users(id, name, role)')
      .eq('status', status)
      .order('requested_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)
    return NextResponse.json({ approvals: data ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/pop-approvals — colaborador solicita início tardio
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const { pop_id, minutes_late, execution_id } = body as {
      pop_id: string
      minutes_late?: number
      execution_id?: string
    }

    if (!pop_id) return NextResponse.json({ error: 'pop_id obrigatório' }, { status: 400 })

    const admin = adminClient()

    // Verifica se já existe solicitação pendente para este pop+user hoje
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await admin
      .from('pop_late_approvals')
      .select('id, status')
      .eq('user_id', sessionUser.id)
      .eq('pop_id', pop_id)
      .eq('status', 'pending')
      .gte('requested_at', today)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ approval: existing[0], already_exists: true })
    }

    const { data, error } = await admin
      .from('pop_late_approvals')
      .insert({
        user_id:      sessionUser.id,
        pop_id,
        execution_id: execution_id ?? null,
        minutes_late: minutes_late ?? null,
        status:       'pending',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // Cria alerta para admin/supervisor (fire-and-forget)
    void admin.from('alerts').insert({
      type:         'pop_not_started',
      execution_id: execution_id ?? null,
      resident_id:  null,
      severity:     'high',
      message:      `Solicitação de início tardio aguardando aprovação — POP ID: ${pop_id} (${minutes_late ?? 0} min de atraso)`,
      triggered_at: new Date().toISOString(),
    })

    return NextResponse.json({ approval: data }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH /api/pop-approvals — admin aprova ou rejeita
export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const { id, status, review_notes } = body as {
      id: string
      status: 'approved' | 'rejected'
      review_notes?: string
    }

    if (!id || !status) return NextResponse.json({ error: 'id e status obrigatórios' }, { status: 400 })

    const admin = adminClient()

    // Verifica se o usuário é admin/supervisor
    const { data: reviewer } = await admin
      .from('users')
      .select('role')
      .eq('id', sessionUser.id)
      .single()

    if (!reviewer || !['admin', 'supervisor'].includes(reviewer.role)) {
      return NextResponse.json({ error: 'Sem permissão para revisar aprovações' }, { status: 403 })
    }

    const { error } = await admin
      .from('pop_late_approvals')
      .update({
        status,
        reviewed_by:  sessionUser.id,
        reviewed_at:  new Date().toISOString(),
        review_notes: review_notes ?? null,
      })
      .eq('id', id)

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
