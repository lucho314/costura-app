'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Toast from '@/components/ui/toast'
import MovimientoForm from './movimiento-form'
import { getMovimientosPage } from '@/lib/actions/movimientos'
import type { MovimientoStock, Producto, EstadisticasMovimientos, TipoMovimiento } from '@/types'

const PAGE_SIZE = 30

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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MovimientosClient({
  initialMovimientos,
  initialTotal,
  estadisticas,
  productos,
}: {
  initialMovimientos: MovimientoStock[]
  initialTotal: number
  estadisticas: EstadisticasMovimientos
  productos: Producto[]
}) {
  const [items, setItems] = useState(initialMovimientos)
  const [total, setTotal] = useState(initialTotal)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoMovimiento | ''>('')
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [, startTransition] = useTransition()

  // Refs to avoid stale closures
  const tipoRef = useRef<TipoMovimiento | ''>('')
  const offsetRef = useRef(initialMovimientos.length)
  const totalRef = useRef(initialTotal)
  const isLoadingRef = useRef(false)
  const sentinelRef = useRef<HTMLTableRowElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => { totalRef.current = total }, [total])

  // ── Data fetching ──────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || offsetRef.current >= totalRef.current) return
    isLoadingRef.current = true
    setIsLoadingMore(true)
    try {
      const { movimientos: next, total: newTotal } = await getMovimientosPage(
        offsetRef.current, PAGE_SIZE, tipoRef.current || undefined
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

  const refreshList = useCallback(async (tipo: TipoMovimiento | '') => {
    if (isLoadingRef.current) return
    tipoRef.current = tipo
    offsetRef.current = 0
    isLoadingRef.current = true
    setIsLoadingMore(true)
    try {
      const { movimientos: fresh, total: newTotal } = await getMovimientosPage(
        0, PAGE_SIZE, tipo || undefined
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

  // Tipo filter changes → reload from server
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    startTransition(() => { refreshList(filtroTipo) })
  }, [filtroTipo, refreshList])

  // IntersectionObserver sentinel
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '100px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  // Client-side text filter on loaded items
  const filtered = items.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.producto?.nombre?.toLowerCase().includes(q) ||
      (m.notas ?? '').toLowerCase().includes(q)
    )
  })

  const hasMore = items.length < total
  const clearToast = useCallback(() => setToast(null), [])

  function handleSuccess(message: string) {
    setToast({ message, type: 'success' })
    refreshList(tipoRef.current)
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Movimientos de Stock
          </h1>
          <p className="text-sm text-gray-500">
            Registra ventas, producciones y ajustes de inventario
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-700 hover:to-indigo-700"
        >
          + Registrar movimiento
        </button>
      </div>

      {/* Estadísticas */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-50 p-3">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Ventas</p>
              <p className="text-2xl font-extrabold text-gray-900">{estadisticas.totalVentas}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-50 p-3">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Producción</p>
              <p className="text-2xl font-extrabold text-gray-900">{estadisticas.totalProduccion}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-3">
              <svg className="h-6 w-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Ingresos</p>
              <p className="text-2xl font-extrabold text-gray-900">
                {fmoney(estadisticas.totalIngresos)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Ganancias</p>
              <p className="text-2xl font-extrabold text-gray-900">
                {fmoney(estadisticas.totalGanancias)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Productos más vendidos */}
      {estadisticas.productosMasVendidos.length > 0 && (
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-gray-800">Productos más vendidos</h2>
          <div className="space-y-3">
            {estadisticas.productosMasVendidos.slice(0, 5).map((item, index) => {
              const maxVentas = estadisticas.productosMasVendidos[0].cantidad_vendida
              const percentage = (item.cantidad_vendida / maxVentas) * 100

              return (
                <div key={item.producto_id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-sm font-bold text-violet-700">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{item.nombre}</span>
                      <span className="font-mono text-gray-600">
                        {item.cantidad_vendida} vendidas · {fmoney(item.ingresos)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="p-5 pb-4">
          <h2 className="mb-3 font-bold text-gray-800">Historial de movimientos</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Buscar por producto o notas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value as TipoMovimiento | '')}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="">Todos los tipos</option>
              <option value="venta">Ventas</option>
              <option value="produccion">Producción</option>
              <option value="ajuste">Ajustes</option>
            </select>
          </div>
        </div>

        {items.length === 0 && !isLoadingMore ? (
          <p className="py-8 text-center text-sm text-gray-400">
            {filtroTipo
              ? 'No hay movimientos de ese tipo todavía.'
              : 'Todavía no hay movimientos registrados.'}
          </p>
        ) : (
          /* Scrollable container with sticky header */
          <div className="overflow-auto max-h-[560px]">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Producto</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Cantidad</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Precio/Ganancia</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-gray-400">
                      No se encontraron movimientos con ese filtro.
                    </td>
                  </tr>
                ) : (
                  filtered.map(m => (
                    <tr key={m.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{formatDate(m.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {m.producto?.nombre || 'Producto eliminado'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-lg px-2 py-1 text-xs font-semibold ${
                          m.tipo === 'venta'
                            ? 'bg-red-50 text-red-700'
                            : m.tipo === 'produccion'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          {m.tipo === 'venta' ? 'Venta' : m.tipo === 'produccion' ? 'Producción' : 'Ajuste'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                        {m.tipo === 'venta' ? `-${m.cantidad}` : `+${m.cantidad}`}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-gray-600">
                        <span className="text-gray-400">{m.stock_anterior}</span>
                        {' → '}
                        <span className="font-semibold text-gray-900">{m.stock_nuevo}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {m.tipo === 'venta' && m.precio_venta !== null ? (
                          <div>
                            <div className="font-mono font-semibold text-gray-900">{fmoney(m.precio_venta)}</div>
                            <div className={`text-xs font-mono ${(m.ganancia_real || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {fmoney(m.ganancia_real || 0)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {m.notas
                          ? <span className="line-clamp-2">{m.notas}</span>
                          : <span className="text-gray-300">-</span>
                        }
                      </td>
                    </tr>
                  ))
                )}

                {/* Sentinel row */}
                <tr ref={sentinelRef}>
                  <td colSpan={7} className="px-4 py-3 text-center">
                    {isLoadingMore ? (
                      <span className="inline-flex items-center gap-2 text-xs text-gray-400">
                        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                        </svg>
                        Cargando más...
                      </span>
                    ) : !hasMore ? (
                      <span className="text-xs text-gray-300">
                        {items.length} de {total} movimientos
                      </span>
                    ) : null}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MovimientoForm
        productos={productos}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </div>
  )
}
