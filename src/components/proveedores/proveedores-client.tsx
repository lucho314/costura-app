'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Modal from '@/components/ui/modal'
import Toast from '@/components/ui/toast'
import { createProveedor, deleteProveedor, getProveedoresPage, updateProveedor } from '@/lib/actions/proveedores'
import type { Proveedor } from '@/types'

const PAGE_SIZE = 10

interface ToastState {
  message: string
  type: 'success' | 'error'
}

function getInitials(nombre: string) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

const AVATAR_COLORS = [
  'from-violet-500 to-indigo-500',
  'from-indigo-500 to-blue-500',
  'from-purple-500 to-violet-500',
  'from-fuchsia-500 to-purple-500',
  'from-blue-500 to-indigo-600',
]

function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

function IconPin() {
  return (
    <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function IconPhone() {
  return (
    <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.1 6.1l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/>
    </svg>
  )
}

function IconLink() {
  return (
    <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  )
}

function IconMaps() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5Z"/>
    </svg>
  )
}

function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

export default function ProveedoresClient({
  initialProveedores,
  initialTotal,
}: {
  initialProveedores: Proveedor[]
  initialTotal: number
}) {
  const [items, setItems] = useState(initialProveedores)
  const [total, setTotal] = useState(initialTotal)
  const [search, setSearch] = useState('')
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Refs to avoid stale closures inside callbacks
  const searchRef = useRef('')
  const offsetRef = useRef(initialProveedores.length)
  const totalRef = useRef(initialTotal)
  const isLoadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFirstSearchRender = useRef(true)

  // Keep totalRef in sync with state
  useEffect(() => { totalRef.current = total }, [total])

  // Modal / form state
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Proveedor | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Data fetching ──────────────────────────────────────────

  const refreshList = useCallback(async () => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    setIsLoadingMore(true)
    try {
      const { proveedores: fresh, total: newTotal } = await getProveedoresPage(
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
      const { proveedores: next, total: newTotal } = await getProveedoresPage(
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

  // Debounced search — resets list on each keystroke after first render
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
        const { proveedores: fresh, total: newTotal } = await getProveedoresPage(
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

  // IntersectionObserver — triggers loadMore when sentinel comes into view
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

  // ── Modal helpers ──────────────────────────────────────────

  function openAdd() {
    setEditing(null)
    setError('')
    setModalOpen(true)
  }

  function openEdit(proveedor: Proveedor) {
    setEditing(proveedor)
    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setError('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = editing
        ? await updateProveedor(editing.id, formData)
        : await createProveedor(formData)

      if (res?.error) {
        setError(res.error)
      } else {
        closeModal()
        setToast({ message: editing ? 'Proveedor actualizado' : 'Proveedor agregado', type: 'success' })
        await refreshList()
      }
    })
  }

  function handleDelete(proveedor: Proveedor) {
    if (!confirm(`¿Eliminar "${proveedor.nombre}"? Los materiales asociados quedarán sin proveedor.`)) return

    startTransition(async () => {
      const res = await deleteProveedor(proveedor.id)
      if (res?.error) {
        setToast({ message: res.error, type: 'error' })
      } else {
        setToast({ message: 'Proveedor eliminado', type: 'success' })
        await refreshList()
      }
    })
  }

  const clearToast = useCallback(() => setToast(null), [])

  const hasMore = items.length < total

  // ── Render ─────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Proveedores</h2>
          <p className="text-sm text-gray-500">
            {total} proveedor{total !== 1 ? 'es' : ''} registrado{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-700 hover:to-indigo-700"
        >
          <span className="text-base">+</span> Agregar Proveedor
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar proveedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
      </div>

      {/* Cards grid */}
      {items.length === 0 && !isLoadingMore ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p className="font-semibold text-gray-700">{search ? 'Sin resultados' : 'Sin proveedores todavía'}</p>
          {!search && (
            <p className="mt-1 max-w-xs text-sm text-gray-400">
              Agregá proveedores para asignarlos opcionalmente a tus materiales.
            </p>
          )}
          {!search && (
            <button
              onClick={openAdd}
              className="mt-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-700 hover:to-indigo-700"
            >
              Agregar primer proveedor
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map(proveedor => (
              <div
                key={proveedor.id}
                className="relative rounded-2xl border border-transparent bg-white p-5 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
              >
                {/* Action buttons */}
                <div className="absolute right-4 top-4 flex gap-1">
                  {proveedor.google_maps_url && (
                    <a
                      href={proveedor.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Ver en Google Maps"
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600"
                    >
                      <IconMaps />
                    </a>
                  )}
                  <button
                    onClick={() => openEdit(proveedor)}
                    title="Editar"
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                  >
                    <IconEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(proveedor)}
                    title="Eliminar"
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <IconTrash />
                  </button>
                </div>

                {/* Avatar + name */}
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarColor(proveedor.id)} text-sm font-bold text-white shadow-sm`}>
                    {getInitials(proveedor.nombre)}
                  </div>
                  <div className="min-w-0 pr-12">
                    <p className="truncate font-semibold text-gray-900">{proveedor.nombre}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-violet-400"><IconPin /></span>
                    <span className="line-clamp-2">{proveedor.direccion ?? 'Sin dirección'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-violet-400"><IconPhone /></span>
                    <span>{proveedor.telefono ?? 'Sin teléfono'}</span>
                  </div>
                  {proveedor.pagina ? (
                    <div className="flex items-center gap-2">
                      <span className="text-violet-400"><IconLink /></span>
                      <a
                        href={proveedor.pagina}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-violet-600 hover:underline"
                      >
                        {proveedor.pagina.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Sentinel + loading indicator */}
          <div ref={sentinelRef} className="mt-4 flex justify-center py-4">
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
                Cargando más...
              </div>
            )}
            {!isLoadingMore && !hasMore && items.length > 0 && (
              <p className="text-xs text-gray-300">
                {items.length} de {total} proveedores
              </p>
            )}
          </div>
        </>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar Proveedor' : 'Agregar Proveedor'}>
        <form key={editing ? `edit-${editing.id}` : 'add-proveedor'} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              name="nombre"
              type="text"
              defaultValue={editing?.nombre ?? ''}
              placeholder="Ej: Casa Lopez"
              autoFocus
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Dirección</label>
            <input
              name="direccion"
              type="text"
              defaultValue={editing?.direccion ?? ''}
              placeholder="Ej: Monte Caseros 197, Paraná"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
            <input
              name="telefono"
              type="text"
              defaultValue={editing?.telefono ?? ''}
              placeholder="Ej: 0343 423-0000"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Página web</label>
            <input
              name="pagina"
              type="url"
              defaultValue={editing?.pagina ?? ''}
              placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          {editing?.google_maps_url && (
            <a
              href={editing.google_maps_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-violet-700 hover:text-violet-900"
            >
              Ver ficha en Google Maps
            </a>
          )}

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
