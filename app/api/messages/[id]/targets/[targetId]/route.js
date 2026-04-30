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

// DELETE /api/messages/[id]/targets/[targetId]
export async function DELETE(req, { params }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id, targetId } = await params
  const res = await apiServer('DELETE', `/messages/${id}/targets/${targetId}`)
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return new NextResponse(null, { status: 204 })
  }
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
