import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Rutas públicas — sin restricción
  if (
    path === '/' ||
    path.startsWith('/auth')
  ) {
    return supabaseResponse
  }

  // Sin sesión → login
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Leer rol desde profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = profile?.role

  // /asesores/* → requiere asesor o superadmin
  if (path.startsWith('/asesores')) {
    if (role !== 'asesor' && role !== 'superadmin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // /desarrolladores/* → requiere desarrollador o superadmin
  if (path.startsWith('/desarrolladores')) {
    if (role !== 'desarrollador' && role !== 'superadmin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // /admin/* → requiere superadmin
  if (path.startsWith('/admin')) {
    if (role !== 'superadmin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
