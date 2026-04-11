'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

const NAV_LINKS = [
  { href: '/materiales',  label: '📦 Materiales' },
  { href: '/proveedores', label: '🏷️ Proveedores' },
  { href: '/calculadora', label: '🧮 Crear producto' },
  { href: '/productos',   label: '🗂️ Stock' },
  { href: '/movimientos', label: '📊 Movimientos' },
]

export default function Navbar({ user }: { user: User }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <>
      {/* ═══════════════════════════════════════════
          DESKTOP SIDEBAR  (visible ≥ 1024px via CSS)
          ═══════════════════════════════════════════ */}
      <aside className="app-sidebar">
        {/* Logo */}
        <Link
          href="/materiales"
          className="flex items-center gap-3 px-5 py-6 hover:bg-white/5 transition-colors"
          style={{ borderBottom: '1px solid rgba(255,255,255,.12)' }}
        >
          <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🧵</span>
          <span style={{ fontWeight: 800, color: '#fff', fontSize: '.875rem', lineHeight: 1.3 }}>
            Gestion de<br />Materiales
          </span>
        </Link>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '1.25rem .75rem', display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.625rem',
                  borderRadius: '.5rem',
                  padding: '.625rem .75rem',
                  fontSize: '.875rem',
                  fontWeight: 600,
                  transition: 'background .15s, color .15s',
                  background: active ? 'rgba(255,255,255,.2)' : 'transparent',
                  color:      active ? '#fff' : 'rgba(255,255,255,.65)',
                }}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,.12)' }}>
          <p style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.45)', marginBottom: '.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </p>
          <button
            onClick={handleSignOut}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: 500, color: 'rgba(255,255,255,.55)', display: 'flex', alignItems: 'center', gap: '.5rem', padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fca5a5')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.55)')}
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════
          MOBILE TOP BAR  (visible < 1024px via CSS)
          ═══════════════════════════════════════════ */}
      <header className="mobile-topbar" style={{ padding: '0 .75rem' }}>
        {/* Hamburger button */}
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Abrir menú"
          aria-expanded={open}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '.5rem', borderRadius: '.5rem', display: 'flex', flexDirection: 'column', gap: '5px' }}
        >
          <span style={{
            display: 'block', width: '20px', height: '2px', background: '#fff', borderRadius: '2px',
            transition: 'transform .2s, opacity .2s',
            transform: open ? 'rotate(45deg) translate(5px, 5px)' : 'none',
          }} />
          <span style={{
            display: 'block', width: '20px', height: '2px', background: '#fff', borderRadius: '2px',
            transition: 'opacity .2s',
            opacity: open ? 0 : 1,
          }} />
          <span style={{
            display: 'block', width: '20px', height: '2px', background: '#fff', borderRadius: '2px',
            transition: 'transform .2s',
            transform: open ? 'rotate(-45deg) translate(5px, -5px)' : 'none',
          }} />
        </button>

        {/* Centered title */}
        <Link
          href="/materiales"
          onClick={() => setOpen(false)}
          style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: '.5rem',
            color: '#fff', fontWeight: 800, fontSize: '.875rem', whiteSpace: 'nowrap', textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>🧵</span>
          Gestion de Materiales
        </Link>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="mobile-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ═══════════════════════════════════════════
          MOBILE DRAWER  (slides from left)
          ═══════════════════════════════════════════ */}
      <div
        className="mobile-drawer"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        {/* User strip */}
        <div style={{ padding: '1rem 1.25rem', background: '#f5f3ff', borderBottom: '1px solid #ede9fe' }}>
          <p style={{ fontSize: '.625rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.25rem' }}>
            Cuenta
          </p>
          <p style={{ fontSize: '.875rem', fontWeight: 600, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </p>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '1rem .75rem', display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '.75rem',
                  borderRadius: '.75rem', padding: '.75rem 1rem',
                  fontSize: '.875rem', fontWeight: 600,
                  background: active ? '#ede9fe' : 'transparent',
                  color:      active ? '#6d28d9' : '#4b5563',
                  textDecoration: 'none',
                  transition: 'background .15s, color .15s',
                }}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '.75rem', borderTop: '1px solid #f3f4f6' }}>
          <button
            onClick={() => { setOpen(false); handleSignOut() }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '.5rem', borderRadius: '.75rem', padding: '.75rem 1rem',
              fontSize: '.875rem', fontWeight: 600, color: '#ef4444',
              background: 'none', border: 'none', cursor: 'pointer',
              transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </div>
    </>
  )
}
