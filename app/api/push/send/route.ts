import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  try {
    const body = await req.json() as {
      title: string
      body: string
      url?: string
      tag?: string
      userId?: string   // se omitido, envia para todos
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )

    // Apenas admin/supervisor podem disparar notificações via API
    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.user_metadata?.role as string | undefined
    if (!user || (role !== 'admin' && role !== 'supervisor')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Busca subscriptions (do usuário alvo ou todas)
    const query = supabase.from('push_subscriptions').select('endpoint, p256dh, auth')
    if (body.userId) query.eq('user_id', body.userId)
    const { data: subs } = await query

    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0, message: 'Nenhum dispositivo inscrito' })
    }

    const payload = JSON.stringify({
      title: body.title,
      body:  body.body,
      url:   body.url ?? '/dashboard',
      tag:   body.tag ?? 'villa-amor',
      icon:  '/icon-192.png',
    })

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    )

    const sent   = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    // Remove subscriptions expiradas (status 410)
    const expired = results
      .map((r, i) => ({ r, sub: subs[i] }))
      .filter(({ r }) => r.status === 'rejected' && (r.reason as { statusCode?: number })?.statusCode === 410)
    if (expired.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expired.map(({ sub }) => sub.endpoint))
    }

    return NextResponse.json({ sent, failed })
  } catch (err) {
    console.error('Push send error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
