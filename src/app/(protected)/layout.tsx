import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/navbar'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/auth/login')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={data.user} />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        {children}
      </main>
    </div>
  )
}
