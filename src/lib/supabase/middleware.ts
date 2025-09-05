import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isPublicRoute = request.nextUrl.pathname === '/';
  
  // Cualquier ruta que no sea la de login es considerada protegida
  const isProtectedRoute = !isPublicRoute;

  // Si no hay usuario y se intenta acceder a una ruta protegida, redirigir a login
  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Si hay usuario y se intenta acceder a la página de login, redirigir al inventario
  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL('/inventory', request.url));
  }

  return response
}
