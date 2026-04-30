import { NextResponse } from 'next/server'
import { getIronSessionData } from '@/lib/session'

export async function POST(req) {
  const { password } = await req.json()

  if (!password || password !== process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: 'Senha inválida.' }, { status: 401 })
  }

  const session = await getIronSessionData()
  session.authenticated = true
  await session.save()

  return NextResponse.json({ ok: true })
}
