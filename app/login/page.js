import { getIronSessionData } from '@/lib/session'
import { redirect } from 'next/navigation'
import LoginPage from '@/components/LoginPage'

export default async function Login() {
  const session = await getIronSessionData()
  if (session?.authenticated) {
    redirect('/')
  }

  return <LoginPage />
}
