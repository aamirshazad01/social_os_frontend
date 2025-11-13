import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // All authentication and session management is handled by FastAPI backend
  // This middleware is kept minimal for future extensibility
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
