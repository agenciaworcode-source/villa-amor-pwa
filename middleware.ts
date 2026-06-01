import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value))
          res = NextResponse.next({
            request: req,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = req.nextUrl.clone()

  // Unauthenticated — redirect to login
  if (!user && !url.pathname.startsWith('/login')) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // 1. Fast path: role in JWT metadata (set at login / after metadata update)
    let role = user.user_metadata?.role as string | undefined

    // 2. Cookie cache — avoids a DB round-trip on every request when JWT is stale
    if (!role) {
      role = req.cookies.get('x-role')?.value
    }

    // 3. DB fallback — only on first request after login when metadata is missing
    if (!role) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      role = profile?.role as string | undefined
      // Cache in cookie so subsequent requests skip the DB query (1h TTL)
      if (role) {
        res.cookies.set('x-role', role, {
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 60 * 60,
          path: '/',
        })
      }
    }

    const isDashboardRoute = url.pathname.startsWith('/dashboard')
    const isLoginRoute = url.pathname.startsWith('/login')
    const isRootRoute = url.pathname === '/'
    const isMobileRoute = /^\/(home|pops|alerts|profile|shift|resident|execution|incidents)(\/.*)?$/.test(url.pathname)
    const canAccessDashboard = role === 'admin' || role === 'supervisor'

    // Authenticated user on login page — redirect to their home
    if (isLoginRoute) {
      url.pathname = canAccessDashboard ? '/dashboard' : '/home'
      return NextResponse.redirect(url)
    }

    // Root "/" — redirect to appropriate home
    if (isRootRoute) {
      url.pathname = canAccessDashboard ? '/dashboard' : '/home'
      return NextResponse.redirect(url)
    }

    // Admin/supervisor landing on a mobile route (e.g. PWA reopened via start_url) — redirect to dashboard
    if (isMobileRoute && canAccessDashboard) {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Non-admin/supervisor trying to access dashboard
    if (isDashboardRoute && !canAccessDashboard) {
      url.pathname = '/home'
      return NextResponse.redirect(url)
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - villa-amor-logo.png
     */
    '/((?!api|_next/static|_next/image|favicon.ico|offline|.*\\.png|.*\\.ico|manifest\\.json|sw\\.js|workbox-.*).*)',
  ],
}
