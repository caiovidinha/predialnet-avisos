import { NextResponse } from 'next/server'
import { getIronSessionData } from '@/lib/session'
import { apiServer } from '@/lib/api'

async function requireAuth() {
  const session = await getIronSessionData()
  if (!session?.authenticated) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  return null
}

// GET /api/messages?page=1&limit=20&includeInactive=false
export async function GET(req) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const qs = searchParams.toString()
  const res = await apiServer('GET', `/messages${qs ? `?${qs}` : ''}`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

// POST /api/messages
export async function POST(req) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const res = await apiServer('POST', '/messages', body)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
