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

// Checklist padrão de documentos do residente (espelha a seed da migration
// 20260702b). Usado para semear registros criados APÓS a migration, para os
// quais nenhuma linha existe ainda.
const DEFAULT_RESIDENT_DOCS = [
  'rg', 'cpf', 'vacina', 'contrato_social',
  'plano_saude', 'plano_funerario', 'comprovante_residencia',
]

// GET /api/resident-documents?resident_id=xxx
// Se o residente ainda não tiver checklist, cria o padrão (lazy seed) e retorna.
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const residentId = req.nextUrl.searchParams.get('resident_id')
    if (!residentId) return NextResponse.json({ error: 'resident_id obrigatório' }, { status: 400 })

    const admin = adminClient()
    const { data, error } = await admin
      .from('resident_documents')
      .select('*')
      .eq('resident_id', residentId)
      .order('doc_type')

    if (error) throw new Error(error.message)

    // Lazy seed: residente sem nenhum documento recebe o checklist padrão.
    if (!data || data.length === 0) {
      const { data: seeded, error: seedError } = await admin
        .from('resident_documents')
        .insert(DEFAULT_RESIDENT_DOCS.map(doc_type => ({ resident_id: residentId, doc_type, status: 'pendente' })))
        .select()
      if (seedError) throw new Error(seedError.message)
      return NextResponse.json({ documents: (seeded ?? []).sort((a, b) => a.doc_type.localeCompare(b.doc_type)) })
    }

    return NextResponse.json({ documents: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/resident-documents — cria registro de documento
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const { resident_id, doc_type } = body as { resident_id: string; doc_type: string }

    if (!resident_id || !doc_type) {
      return NextResponse.json({ error: 'resident_id e doc_type obrigatórios' }, { status: 400 })
    }

    const admin = adminClient()
    const { data, error } = await admin
      .from('resident_documents')
      .insert({ resident_id, doc_type, status: 'pendente' })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ document: data }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH /api/resident-documents — atualiza status ou notas
export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const { id, status, notes } = body as { id: string; status?: string; notes?: string }

    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    const admin = adminClient()
    const updates: Record<string, unknown> = {}
    if (status !== undefined) updates.status = status
    if (notes  !== undefined) updates.notes  = notes

    const { data, error } = await admin
      .from('resident_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ document: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
