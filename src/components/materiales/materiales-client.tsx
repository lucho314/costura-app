'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Modal from '@/components/ui/modal'
import Toast from '@/components/ui/toast'
import { createMaterial, deleteMaterial, getMaterialesPage, updateMaterial } from '@/lib/actions/materiales'
import { formatMoney } from '@/lib/format'
import type { Material, Proveedor } from '@/types'
import { UNIDADES } from '@/types'

const PAGE_SIZE = 15

interface ToastState {
  message: string
  type: 'success' | 'error'
}

export default function MaterialesClient({
  initialMateriales,
  initialTotal,
  proveedores,
}: {
  initialMateriales: Material[]
  initialTotal: number
  proveedores: Proveedor[]
}) {
  const [items, setItems] = useState(initialMateriales)
  const [total, setTotal] = useState(initialTotal)
  const [search, setSearch] = useState('')
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Refs to avoid stale closures
  const searchRef = useRef('')
  const offsetRef = useRef(initialMateriales.length)
  const totalRef = useRef(initialTotal)
  const isLoadingRef = useRef(false)
  const sentinelRef = useRef<HTMLTableRowElement>(null)
  const isFirstSearchRender = useRef(true)

  useEffect(() => { totalRef.current = total }, [total])

  // Modal / form state
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)
  const [selectedProveedorId, setSelectedProveedorId] = useState<number | null>(null)
  const [proveedorQuery, setProveedorQuery] = useState('')
  const [proveedorFocused, setProveedorFocused] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [isPending, startTransition] = useTransition()

  const proveedorOptions = proveedores.map(p => ({ id: p.id, label: p.nombre }))
  const filteredProveedorOptions = proveedorQuery.trim() === ''
    ? proveedorOptions.slice(0, 8)
    : proveedorOptions
        .filter(p => p.label.toLowerCase().includes(proveedorQuery.toLowerCase()))
        .slice(0, 8)

  // ── Data fetching ──────────────────────────────────────────

  const refreshList = useCallback(async () => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    setIsLoadingMore(true)
    try {
      const { materiales: fresh, total: newTotal } = await getMaterialesPage(
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
      const { materiales: next, total: newTotal } = await getMaterialesPage(
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
        const { materiales: fresh, total: newTotal } = await getMaterialesPage(
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

  // Sentinel IntersectionObserver — fires loadMore when last row comes into view
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

  // ── Modal helpers ──────────────────────────────────────────

  function openAdd() {
    setEditing(null)
    setSelectedProveedorId(null)
    setProveedorQuery('')
    setError('')
    setModalOpen(true)
  }

  function openEdit(m: Material) {
    setEditing(m)
    setSelectedProveedorId(m.proveedor_id)
    setProveedorQuery(m.proveedor?.nombre ?? '')
    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setSelectedProveedorId(null)
    setProveedorQuery('')
    setError('')
  }

  function handleProveedorInput(value: string) {
    setProveedorQuery(value)
    const exactMatch = proveedorOptions.find(p => p.label.toLowerCase() === value.trim().toLowerCase())
    setSelectedProveedorId(exactMatch?.id ?? null)
  }

  function handleProveedorSelect(id: number | null, label: string) {
    setSelectedProveedorId(id)
    setProveedorQuery(label)
    setProveedorFocused(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    formData.set('proveedor_id', selectedProveedorId ? String(selectedProveedorId) : '')

    startTransition(async () => {
      const res = editing
        ? await updateMaterial(editing.id, formData)
        : await createMaterial(formData)

      if (res?.error) {
        setError(res.error)
      } else {
        closeModal()
        setToast({ message: editing ? 'Material actualizado' : 'Material agregado', type: 'success' })
        await refreshList()
      }
    })
  }

  function handleDelete(m: Material) {
    if (!confirm(`¿Eliminar "${m.nombre}"?`)) return

    startTransition(async () => {
      const res = await deleteMaterial(m.id)
      if (res?.error) {
        setToast({ message: res.error, type: 'error' })
      } else {
        setToast({ message: 'Material eliminado', type: 'success' })
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
          <h2 className="text-xl font-bold text-gray-900">Inventario de Materiales</h2>
          <p className="text-sm text-gray-500">
            {total} material{total !== 1 ? 'es' : ''} registrado{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-700 hover:to-indigo-700"
        >
          <span className="text-base">+</span> Agregar Material
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar material..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
      </div>

      {/* Table with sticky header */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {items.length === 0 && !isLoadingMore ? (
          <div className="py-16 text-center text-gray-400">
            <div className="mb-3 text-5xl">📦</div>
            <p className="font-semibold text-gray-500">
              {search ? 'Sin resultados' : 'Sin materiales todavía'}
            </p>
            {!search && (
              <p className="mt-1 text-sm">Hacé clic en &quot;Agregar Material&quot; para empezar.</p>
            )}
          </div>
        ) : (
          /* Scrollable container — thead is sticky within this div */
          <div className="overflow-auto max-h-[620px]">
            <table className="w-full min-w-[560px] text-sm">
               <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Material</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Proveedor</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Precio / Unidad</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Unidad</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(m => (
                  <tr key={m.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{m.proveedor?.nombre ?? 'Sin proveedor'}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                      {formatMoney(m.precio)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-md bg-violet-50 px-2 py-0.5 text-xs font-mono font-semibold text-violet-700">
                        {m.unidad}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEdit(m)}
                          className="rounded p-1 text-gray-400 transition-colors hover:text-violet-600"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="rounded p-1 text-gray-400 transition-colors hover:text-red-500"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Sentinel row — observed by IntersectionObserver */}
                <tr ref={sentinelRef}>
                  <td colSpan={5} className="px-4 py-3 text-center">
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
                        {items.length} de {total} materiales
                      </span>
                    ) : null}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar Material' : 'Agregar Material'}
      >
        <form key={editing ? `edit-${editing.id}` : 'add-material'} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              name="nombre"
              type="text"
              defaultValue={editing?.nombre ?? ''}
              placeholder="Ej: Tela algodon"
              autoFocus
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Proveedor</label>
            <input type="hidden" name="proveedor_id" value={selectedProveedorId ?? ''} />
            <div className="relative">
              <input
                type="text"
                value={proveedorQuery}
                onChange={e => handleProveedorInput(e.target.value)}
                onFocus={() => setProveedorFocused(true)}
                onBlur={() => setTimeout(() => setProveedorFocused(false), 150)}
                placeholder="Buscar proveedor..."
                autoComplete="off"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              {proveedorFocused && (
                <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => handleProveedorSelect(null, '')}
                    className="block w-full px-3 py-2 text-left text-sm text-gray-500 transition-colors hover:bg-gray-50"
                  >
                    Sin proveedor
                  </button>
                  {filteredProveedorOptions.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleProveedorSelect(p.id, p.label)}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-violet-50 hover:text-violet-700"
                    >
                      {p.label}
                    </button>
                  ))}
                  {proveedorQuery.trim() !== '' && filteredProveedorOptions.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">No hay coincidencias</div>
                  )}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">Opcional. Escribí para buscar y seleccioná un proveedor existente.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Unidad de medida <span className="text-red-500">*</span>
            </label>
            <select
              name="unidad"
              defaultValue={editing?.unidad ?? ''}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="">Seleccionar...</option>
              {UNIDADES.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Precio por unidad <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">$</span>
              <input
                name="precio"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editing?.precio ?? ''}
                placeholder="0.00"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-7 pr-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
            >
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </>
  )
}
