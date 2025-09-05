import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;

  const isPublicRoute = request.nextUrl.pathname === '/';
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/inventory') || request.nextUrl.pathname.startsWith('/orders');

  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL('/inventory', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
