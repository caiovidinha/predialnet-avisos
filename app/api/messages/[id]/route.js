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

// GET /api/messages/[id]
export async function GET(req, { params }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = await params
  const res = await apiServer('GET', `/messages/${id}`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

// PATCH /api/messages/[id]
export async function PATCH(req, { params }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = await params
  const body = await req.json()
  const res = await apiServer('PATCH', `/messages/${id}`, body)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

// DELETE /api/messages/[id]
export async function DELETE(req, { params }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = await params
  const res = await apiServer('DELETE', `/messages/${id}`)
  // DELETE may return 204 with no body
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return new NextResponse(null, { status: 204 })
  }
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
