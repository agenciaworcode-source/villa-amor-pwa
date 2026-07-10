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

async function assertAdminOrSupervisor(admin: ReturnType<typeof adminClient>, userId: string) {
  const { data } = await admin.from('users').select('role').eq('id', userId).single()
  if (!data || !['admin', 'supervisor'].includes(data.role)) {
    throw new Error('Sem permissão')
  }
}

// POST /api/residents/photo
// FormData: file, resident_id
// Faz upload ao bucket público resident-photos e grava residents.photo_url
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const admin = adminClient()
    await assertAdminOrSupervisor(admin, sessionUser.id)

    const formData = await req.formData()
    const file       = formData.get('file')        as File | null
    const residentId = formData.get('resident_id') as string | null

    if (!file || !residentId) {
      return NextResponse.json({ error: 'file e resident_id obrigatórios' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'O arquivo deve ser uma imagem' }, { status: 400 })
    }

    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const storagePath = `${residentId}/photo.${ext}`
    const bytes = await file.arrayBuffer()

    // Garante que o bucket público exista (caso a migration ainda não tenha rodado).
    await admin.storage.createBucket('resident-photos', {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
    }).catch(() => {})

    const { error: uploadError } = await admin.storage
      .from('resident-photos')
      .upload(storagePath, bytes, { contentType: file.type, upsert: true })

    if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)

    const { data: pub } = admin.storage.from('resident-photos').getPublicUrl(storagePath)
    // cache-bust: o caminho é fixo (upsert), então versionamos a URL
    const photoUrl = `${pub.publicUrl}?v=${Date.now()}`

    const { error: updateError } = await admin
      .from('residents')
      .update({ photo_url: photoUrl })
      .eq('id', residentId)

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ photo_url: photoUrl }, { status: 200 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    const status = msg === 'Sem permissão' ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
