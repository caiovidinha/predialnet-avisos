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

// POST /api/push — proxies to /push/send-targeted
export async function POST(req) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const res = await apiServer('POST', '/push/send-targeted', body)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
