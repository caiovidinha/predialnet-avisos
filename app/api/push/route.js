import { NextResponse } from 'next/server'
import { apiServer } from '@/lib/api'

// POST /api/push — proxies to /push/send-targeted
export async function POST(req) {
  const body = await req.json()
  const res = await apiServer('POST', '/push/send-targeted', body)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
