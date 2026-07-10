import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

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

async function assertAdminOrSupervisor(userId: string) {
  const admin = adminClient()
  const { data } = await admin.from('users').select('role').eq('id', userId).single()
  if (!data || !['admin', 'supervisor'].includes(data.role)) {
    throw new Error('Sem permissão')
  }
}

// GET /api/resident-responsibles?resident_id=xxx
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const residentId = req.nextUrl.searchParams.get('resident_id')
    if (!residentId) return NextResponse.json({ error: 'resident_id obrigatório' }, { status: 400 })

    const admin = adminClient()
    const { data, error } = await admin
      .from('resident_responsibles')
      .select('*')
      .eq('resident_id', residentId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return NextResponse.json({ responsibles: data ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/resident-responsibles — adiciona responsável
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    await assertAdminOrSupervisor(sessionUser.id)

    const body = await req.json()
    const {
      resident_id, name, relationship, cpf, phone, email, address,
      is_primary, is_emergency_contact,
    } = body as {
      resident_id: string; name: string; relationship?: string
      cpf?: string; phone?: string; email?: string; address?: string
      is_primary?: boolean; is_emergency_contact?: boolean
    }

    if (!resident_id || !name) {
      return NextResponse.json({ error: 'resident_id e name obrigatórios' }, { status: 400 })
    }

    const admin = adminClient()

    // Se is_primary, desmarca os outros
    if (is_primary) {
      await admin
        .from('resident_responsibles')
        .update({ is_primary: false })
        .eq('resident_id', resident_id)
    }

    const { data, error } = await admin
      .from('resident_responsibles')
      .insert({
        resident_id,
        name,
        relationship: relationship ?? null,
        cpf:          cpf          ?? null,
        phone:        phone        ?? null,
        email:        email        ?? null,
        address:      address      ?? null,
        is_primary:           is_primary           ?? false,
        is_emergency_contact: is_emergency_contact ?? false,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ responsible: data }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    const status = msg === 'Sem permissão' ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

// PATCH /api/resident-responsibles — atualiza ou bloqueia
export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    await assertAdminOrSupervisor(sessionUser.id)

    const body = await req.json()
    const { id, ...updates } = body as Record<string, unknown>
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    // Se promovendo para primary, desmarca os outros
    if (updates.is_primary === true && updates.resident_id) {
      const admin = adminClient()
      await admin
        .from('resident_responsibles')
        .update({ is_primary: false })
        .eq('resident_id', updates.resident_id as string)
    }

    const admin = adminClient()
    const { data, error } = await admin
      .from('resident_responsibles')
      .update(updates)
      .eq('id', id as string)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ responsible: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    const status = msg === 'Sem permissão' ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

// DELETE /api/resident-responsibles?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    await assertAdminOrSupervisor(sessionUser.id)

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    const admin = adminClient()
    const { error } = await admin
      .from('resident_responsibles')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    const status = msg === 'Sem permissão' ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
