'use client'

import { useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteProducto } from '@/lib/actions/productos'
import type { Producto } from '@/types'
import Toast from '@/components/ui/toast'

interface ToastState { message: string; type: 'success' | 'error' }

function fmoney(n: number) {
  return '$ ' + n.toLocaleString('es-AR', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export default function ProductosClient({ productos }: { productos: Producto[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = productos.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  )

  function handleDelete(p: Producto) {
    if (!confirm(`¿Eliminar "${p.nombre}" del stock?`)) return
    startTransition(async () => {
      const res = await deleteProducto(p.id)
      if (res?.error) setToast({ message: res.error, type: 'error' })
      else setToast({ message: 'Producto eliminado', type: 'error' })
    })
  }

  const clearToast = useCallback(() => setToast(null), [])

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Stock de Productos</h2>
          <p className="text-sm text-gray-500">{productos.length} producto{productos.length !== 1 ? 's' : ''} guardado{productos.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/calculadora"
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm"
        >
          + Calcular producto
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center text-gray-400">
          <div className="text-5xl mb-3">🗂️</div>
          <p className="font-semibold text-gray-500">
            {search ? 'Sin resultados' : 'Sin productos todavía'}
          </p>
          {!search && (
            <p className="text-sm mt-1">
              Usá la{' '}
              <Link href="/calculadora" className="text-violet-600 hover:underline">calculadora</Link>
              {' '}para crear tu primer producto.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div
              key={p.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-gray-900 truncate">{p.nombre}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(p.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-lg ${
                  p.stock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  Stock: {p.stock}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Costo total</span>
                  <span className="font-mono">{fmoney(p.costo_total)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Margen</span>
                  <span className="font-mono text-green-600">{p.margen}%</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Precio venta</span>
                  <span className="font-mono text-violet-700">{fmoney(p.precio_venta)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Link
                  href={`/productos/${p.id}`}
                  className="flex-1 text-center text-sm font-semibold text-violet-600 border border-violet-200 hover:bg-violet-50 rounded-xl py-2 transition-all"
                >
                  Ver detalle
                </Link>
                <button
                  onClick={() => handleDelete(p)}
                  disabled={isPending}
                  className="text-sm text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-xl px-3 py-2 transition-all disabled:opacity-50"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </>
  )
}
