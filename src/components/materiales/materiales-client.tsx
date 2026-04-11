'use client'

import { useCallback, useState, useTransition } from 'react'
import Modal from '@/components/ui/modal'
import Toast from '@/components/ui/toast'
import { createMaterial, deleteMaterial, updateMaterial } from '@/lib/actions/materiales'
import type { Material } from '@/types'
import { UNIDADES } from '@/types'

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

export default function MaterialesClient({ materiales }: { materiales: Material[] }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = materiales.filter(
    m =>
      m.nombre.toLowerCase().includes(search.toLowerCase()) ||
      m.unidad.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditing(null)
    setError('')
    setModalOpen(true)
  }

  function openEdit(m: Material) {
    setEditing(m)
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
        ? await updateMaterial(editing.id, formData)
        : await createMaterial(formData)

      if (res?.error) {
        setError(res.error)
      } else {
        closeModal()
        setToast({ message: editing ? 'Material actualizado' : 'Material agregado', type: 'success' })
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
        setToast({ message: 'Material eliminado', type: 'error' })
      }
    })
  }

  const clearToast = useCallback(() => setToast(null), [])

  return (
    <>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventario de Materiales</h2>
          <p className="text-sm text-gray-500">
            {materiales.length} material{materiales.length !== 1 ? 'es' : ''} registrado{materiales.length !== 1 ? 's' : ''}
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
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar material..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <div className="mb-3 text-5xl">📦</div>
            <p className="font-semibold text-gray-500">
              {search ? 'Sin resultados' : 'Sin materiales todavia'}
            </p>
            {!search && (
              <p className="mt-1 text-sm">Hace clic en &quot;Agregar Material&quot; para empezar.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Material</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Unidad</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Precio / Unidad</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(m => (
                  <tr key={m.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.nombre}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-md bg-violet-50 px-2 py-0.5 text-xs font-mono font-semibold text-violet-700">
                        {m.unidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                      {fmoney(m.precio)}
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
              </tbody>
            </table>
          </div>
        )}
      </div>

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
