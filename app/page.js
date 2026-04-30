import { getIronSessionData } from '@/lib/session'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/Dashboard'

export default async function HomePage() {
  const session = await getIronSessionData()
  if (!session?.authenticated) {
    redirect('/login')
  }

  return <Dashboard />
}
