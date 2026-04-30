import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

const sessionOptions = {
  cookieName: 'predialnet_alertas_session',
  password: process.env.SESSION_SECRET,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}

/**
 * Server-side session (for App Router route handlers and Server Components).
 */
export async function getIronSessionData() {
  const cookieStore = await cookies()
  return getIronSession(cookieStore, sessionOptions)
}
