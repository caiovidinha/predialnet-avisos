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

// GET /api/sistema-push/campanhas/:id — proxies to /admin/push/campaigns/:id
export async function GET(req, { params }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = await params
  const res = await apiServer('GET', `/admin/push/campaigns/${id}`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
