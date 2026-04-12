'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { deleteProducto, getProductosPage } from '@/lib/actions/productos'
import type { Producto } from '@/types'
import Toast from '@/components/ui/toast'

const PAGE_SIZE = 9

interface ToastState {
  message: string
  type: 'success' | 'error'
}

function fmoney(n: number) {
  return '$ ' + n.toLocaleString('es-AR', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export default function ProductosClient({
  initialProductos,
  initialTotal,
}: {
  initialProductos: Producto[]
  initialTotal: number
}) {
  const [items, setItems] = useState(initialProductos)
  const [total, setTotal] = useState(initialTotal)
  const [search, setSearch] = useState('')
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [isPending, startTransition] = useTransition()

  const searchRef = useRef('')
  const offsetRef = useRef(initialProductos.length)
  const totalRef = useRef(initialTotal)
  const isLoadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFirstSearchRender = useRef(true)

  useEffect(() => { totalRef.current = total }, [total])

  // ── Data fetching ──────────────────────────────────────────

  const refreshList = useCallback(async () => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    setIsLoadingMore(true)
    try {
      const { productos: fresh, total: newTotal } = await getProductosPage(
        0, PAGE_SIZE, searchRef.current || undefined
      )
      setItems(fresh)
      totalRef.current = newTotal
      setTotal(newTotal)
      offsetRef.current = fresh.length
    } finally {
      isLoadingRef.current = false
      setIsLoadingMore(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || offsetRef.current >= totalRef.current) return
    isLoadingRef.current = true
    setIsLoadingMore(true)
    try {
      const { productos: next, total: newTotal } = await getProductosPage(
        offsetRef.current, PAGE_SIZE, searchRef.current || undefined
      )
      setItems(prev => [...prev, ...next])
      totalRef.current = newTotal
      setTotal(newTotal)
      offsetRef.current += next.length
    } finally {
      isLoadingRef.current = false
      setIsLoadingMore(false)
    }
  }, [])

  // Debounced search — skips initial render
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false
      return
    }
    const t = setTimeout(async () => {
      if (isLoadingRef.current) return
      searchRef.current = search
      isLoadingRef.current = true
      setIsLoadingMore(true)
      try {
        const { productos: fresh, total: newTotal } = await getProductosPage(
          0, PAGE_SIZE, search || undefined
        )
        setItems(fresh)
        totalRef.current = newTotal
        setTotal(newTotal)
        offsetRef.current = fresh.length
      } finally {
        isLoadingRef.current = false
        setIsLoadingMore(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  // IntersectionObserver — sentinel div after the grid
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  // ── Actions ────────────────────────────────────────────────

  function handleDelete(p: Producto) {
    if (!confirm(`¿Eliminar "${p.nombre}" del stock?`)) return

    startTransition(async () => {
      const res = await deleteProducto(p.id)
      if (res?.error) {
        setToast({ message: res.error, type: 'error' })
      } else {
        setToast({ message: 'Producto eliminado', type: 'success' })
        await refreshList()
      }
    })
  }

  const clearToast = useCallback(() => setToast(null), [])
  const hasMore = items.length < total

  // ── Render ─────────────────────────────────────────────────

  return (
    <>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Stock de Productos</h2>
          <p className="text-sm text-gray-500">
            {total} producto{total !== 1 ? 's' : ''} guardado{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/calculadora"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-700 hover:to-indigo-700"
        >
          + Crear producto
        </Link>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
      </div>

      {items.length === 0 && !isLoadingMore ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center text-gray-400 shadow-sm">
          <div className="mb-3 text-5xl">🗂️</div>
          <p className="font-semibold text-gray-500">
            {search ? 'Sin resultados' : 'Sin productos todavía'}
          </p>
          {!search && (
            <p className="mt-1 text-sm">
              Usá la{' '}
              <Link href="/calculadora" className="text-violet-600 hover:underline">
                pantalla de alta
              </Link>{' '}
              para crear tu primer producto.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(p => {
              const portada = p.producto_imagenes?.[0]

              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
                    {portada ? (
                      <Image
                        src={portada.url}
                        alt={portada.alt ?? p.nombre}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">
                        Sin foto
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="truncate font-bold text-gray-900">{p.nombre}</h3>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {new Date(p.created_at).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${
                      p.stock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                    }`}>
                      Stock: {p.stock}
                    </span>
                  </div>

                  <div className="space-y-1 border-t border-gray-100 pt-3 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Costo total</span>
                      <span className="font-mono">{fmoney(p.costo_total)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Margen</span>
                      <span className="font-mono text-green-600">{p.margen}%</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Fotos</span>
                      <span className="font-mono">{p.producto_imagenes?.length ?? 0}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900">
                      <span>Precio venta</span>
                      <span className="font-mono text-violet-700">{fmoney(p.precio_venta)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/productos/${p.id}`}
                      className="flex-1 rounded-xl border border-violet-200 py-2 text-center text-sm font-semibold text-violet-600 transition-all hover:bg-violet-50"
                    >
                      Ver detalle
                    </Link>
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={isPending}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-400 transition-all hover:border-red-200 hover:text-red-500 disabled:opacity-50"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sentinel + loading indicator */}
          <div ref={sentinelRef} className="mt-4 flex justify-center py-6">
            {isLoadingMore ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
                Cargando más...
              </div>
            ) : !hasMore && items.length > 0 ? (
              <p className="text-xs text-gray-300">{items.length} de {total} productos</p>
            ) : null}
          </div>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </>
  )
}
