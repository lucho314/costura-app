'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const NAV_LINKS = [
  { href: '/materiales', label: '📦 Materiales' },
  { href: '/calculadora', label: '🧮 Calculadora' },
  { href: '/productos', label: '🗂️ Stock' },
]

export default function Navbar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <header className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link href="/materiales" className="flex items-center gap-2 font-extrabold text-lg tracking-tight select-none">
            <span className="text-2xl">🧵</span>
            <span className="hidden sm:block">Gestión de Materiales</span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  pathname.startsWith(href)
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-sm text-white/70 truncate max-w-40">
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-white/70 hover:text-white transition-colors"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
