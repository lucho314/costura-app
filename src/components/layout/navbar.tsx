'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

const NAV_LINKS = [
  { href: '/materiales', label: '📦 Materiales' },
  { href: '/proveedores', label: '🏷️ Proveedores' },
  { href: '/calculadora', label: '🧮 Crear producto' },
  { href: '/productos', label: '🗂️ Stock' },
  { href: '/movimientos', label: '📊 Movimientos' },
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
      <div className="container mx-auto max-w-6xl px-4">
        {/* Fila 1: logo + salir */}
        <div className="flex h-14 items-center justify-between sm:h-16">
          <Link href="/materiales" className="flex select-none items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="text-2xl">🧵</span>
            <span className="hidden sm:block">Gestion de Materiales</span>
          </Link>

          {/* Nav inline en desktop */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                  pathname.startsWith(href)
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden max-w-40 truncate text-sm text-white/70 md:block">
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-white/70 transition-colors hover:text-white"
              title="Cerrar sesion"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Fila 2: nav en mobile (scroll horizontal sin scrollbar) */}
        <nav className="flex sm:hidden items-center gap-1 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                pathname.startsWith(href)
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
