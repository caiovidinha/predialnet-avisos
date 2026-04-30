import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'

const sessionOptions = {
  cookieName: 'predialnet_alertas_session',
  password: process.env.SESSION_SECRET,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}

export async function proxy(req) {
  const { pathname } = req.nextUrl

  // Public routes that don't require auth
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // API routes are protected at the handler level
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const res = NextResponse.next()
  const session = await getIronSession(req, res, sessionOptions)

  if (!session?.authenticated) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
