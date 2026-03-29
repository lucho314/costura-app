'use client'

import { useState, useTransition, useCallback } from 'react'
import { createMaterial, updateMaterial, deleteMaterial } from '@/lib/actions/materiales'
import { UNIDADES } from '@/types'
import type { Material } from '@/types'
import Modal from '@/components/ui/modal'
import Toast from '@/components/ui/toast'

interface Toast {
  message: string
  type: 'success' | 'error'
}

export default function MaterialesClient({ materiales }: { materiales: Material[] }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventario de Materiales</h2>
          <p className="text-sm text-gray-500">{materiales.length} material{materiales.length !== 1 ? 'es' : ''} registrado{materiales.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm"
        >
          <span className="text-base">+</span> Agregar Material
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar material..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <div className="text-5xl mb-3">📦</div>
            <p className="font-semibold text-gray-500">
              {search ? 'Sin resultados' : 'Sin materiales todavía'}
            </p>
            {!search && (
              <p className="text-sm mt-1">Hacé clic en "Agregar Material" para empezar.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Material</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Unidad</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Precio / Unidad</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.nombre}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-violet-50 text-violet-700 text-xs font-mono font-semibold px-2 py-0.5 rounded-md">
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
                          className="text-gray-400 hover:text-violet-600 transition-colors p-1 rounded"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
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

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar Material' : 'Agregar Material'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              name="nombre"
              type="text"
              defaultValue={editing?.nombre ?? ''}
              placeholder="Ej: Tela algodón"
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidad de medida <span className="text-red-500">*</span>
            </label>
            <select
              name="unidad"
              defaultValue={editing?.unidad ?? ''}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 bg-white"
            >
              <option value="">Seleccionar...</option>
              {UNIDADES.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio por unidad <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input
                name="precio"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editing?.precio ?? ''}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-60"
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

function fmoney(n: number) {
  return '$ ' + n.toLocaleString('es-AR', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}
