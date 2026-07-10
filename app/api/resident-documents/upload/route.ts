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

// POST /api/resident-documents/upload
// FormData: file, doc_id, resident_id
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const formData = await req.formData()
    const file      = formData.get('file')      as File | null
    const docId     = formData.get('doc_id')    as string | null
    const residentId = formData.get('resident_id') as string | null

    if (!file || !docId || !residentId) {
      return NextResponse.json({ error: 'file, doc_id e resident_id obrigatórios' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() ?? 'bin'
    const storagePath = `${residentId}/${docId}.${ext}`
    const bytes = await file.arrayBuffer()

    const admin = adminClient()

    const { error: uploadError } = await admin.storage
      .from('resident-documents')
      .upload(storagePath, bytes, {
        contentType:  file.type,
        upsert:       true,
      })

    if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)

    const { data, error: updateError } = await admin
      .from('resident_documents')
      .update({
        storage_path:    storagePath,
        file_name:       file.name,
        file_size_bytes: file.size,
        mime_type:       file.type,
        status:          'enviado',
        uploaded_at:     new Date().toISOString(),
        uploaded_by:     sessionUser.id,
      })
      .eq('id', docId)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)
    return NextResponse.json({ document: data }, { status: 200 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
