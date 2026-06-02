import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado')
  return createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
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

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const { email, name, role, password } = body as {
      email: string; name: string; role: string; password: string
    }

    if (!email || !name || !role || !password) {
      return NextResponse.json({ error: 'Campos obrigatórios: email, nome, função, senha' }, { status: 400 })
    }

    const admin = adminClient()

    // 1. Cria o usuário no Supabase Auth
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    })

    if (error) throw new Error(error.message)

    const userId = data.user.id

    // 2. Insere direto na tabela users (não depende do trigger)
    const { error: dbError } = await admin
      .from('users')
      .upsert({ id: userId, name, email, role, active: true }, { onConflict: 'id' })

    if (dbError) {
      // Mesmo que a inserção na tabela users falhe, o auth user foi criado.
      // Loga o erro mas não falha a requisição — o trigger pode ter já inserido.
      console.error('Aviso: falha ao inserir na tabela users:', dbError.message)
    }

    return NextResponse.json({ user: data.user }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const { id, name, role, active } = body as {
      id: string; name?: string; role?: string; active?: boolean
    }

    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

    const admin = adminClient()

    // 1. Atualiza no Supabase Auth se houver metadados
    if (name || role) {
      const { error: authError } = await admin.auth.admin.updateUserById(id, {
        user_metadata: { ...(name ? { name } : {}), ...(role ? { role } : {}) }
      })
      if (authError) throw new Error(authError.message)
    }

    // 2. Atualiza na tabela users
    const { error: dbError } = await admin
      .from('users')
      .update({
        ...(name ? { name } : {}),
        ...(role ? { role } : {}),
        ...(active !== undefined ? { active } : {})
      })
      .eq('id', id)

    if (dbError) throw new Error(dbError.message)

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

    const admin = adminClient()

    // 1. Nullificar referências para preservar histórico e evitar FK violation
    //    (necessário enquanto as constraints não forem ON DELETE SET NULL no banco)
    await admin.from('executions').update({ user_id: null }).eq('user_id', id)
    await admin.from('incidents').update({ reported_by: null }).eq('reported_by', id)
    await admin.from('alerts').update({ acknowledged_by: null }).eq('acknowledged_by', id)
    await admin.from('shift_handovers').update({ user_from_id: null }).eq('user_from_id', id)
    await admin.from('shift_handovers').update({ user_to_id: null }).eq('user_to_id', id)

    // 2. Deleta da tabela users
    const { error: dbError } = await admin.from('users').delete().eq('id', id)
    if (dbError) throw new Error(dbError.message)

    // 3. Deleta do Auth (após limpar as dependências)
    const { error: authError } = await admin.auth.admin.deleteUser(id)
    if (authError) throw new Error(authError.message)

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
