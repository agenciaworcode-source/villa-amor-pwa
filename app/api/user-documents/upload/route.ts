import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const BUCKET = 'user-documents'
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

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

// POST /api/user-documents/upload
// FormData: file, doc_id, user_id
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const formData = await req.formData()
    const file    = formData.get('file')    as File | null
    const docId   = formData.get('doc_id') as string | null
    const userId  = formData.get('user_id') as string | null

    if (!file || !docId || !userId) {
      return NextResponse.json({ error: 'Campos obrigatórios: file, doc_id, user_id' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx. 20 MB)' }, { status: 413 })
    }

    const ext  = file.name.split('.').pop() ?? 'bin'
    const path = `${userId}/${docId}.${ext}`

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Garante que o bucket existe (privado)
    await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_SIZE,
    }).catch(() => {})

    // Remove versão anterior se existir
    await admin.storage.from(BUCKET).remove([path]).catch(() => {})

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    // Atualiza o registro do documento
    const { error: dbError } = await admin
      .from('user_documents')
      .update({
        storage_path:    path,
        file_name:       file.name,
        file_size_bytes: file.size,
        mime_type:       file.type,
        status:          'enviado',
        uploaded_at:     new Date().toISOString(),
        uploaded_by:     sessionUser.id,
      })
      .eq('id', docId)

    if (dbError) throw new Error(dbError.message)

    return NextResponse.json({ path, success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
