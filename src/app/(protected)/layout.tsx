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
    <div className="app-layout">
      <Navbar user={data.user} />
      <main className="app-main">
        <div style={{ padding: '1.5rem 1rem', maxWidth: '72rem', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
