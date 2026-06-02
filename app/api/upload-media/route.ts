import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Verifica autenticação do usuário
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  // Lê o FormData
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const path = formData.get('path') as string | null

  if (!file || !path) {
    return NextResponse.json({ error: 'Arquivo ou caminho ausente.' }, { status: 400 })
  }

  // Upload com service role (ignora RLS de storage)
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Garante que o bucket existe
  await admin.storage.createBucket('execution-media', {
    public: false,
    fileSizeLimit: 52428800, // 50 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/webm', 'video/mp4', 'video/quicktime'],
  }).catch(() => { /* bucket já existe — ignora */ })

  const { error } = await admin.storage
    .from('execution-media')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) {
    console.error('[upload-media] storage error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ path })
}
