'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { roundSuggestedPrice } from '@/lib/product-pricing'
import Modal from '@/components/ui/modal'
import Toast from '@/components/ui/toast'
import { updateProductoDetalle } from '@/lib/actions/productos'
import type { Material, ProductoMaterial } from '@/types'

interface ToastState {
  message: string
  type: 'success' | 'error'
}

interface EditableItem {
  materialId: number | ''
  cantidad: number
}

function fmoney(n: number) {
  return '$ ' + n.toLocaleString('es-AR', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export default function ProductoDetailEditor({
  productoId,
  materiales,
  initialItems,
  margen,
}: {
  productoId: number
  materiales: Material[]
  initialItems: ProductoMaterial[]
  margen: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<EditableItem[]>(() => toEditableItems(initialItems))
  const [error, setError] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [isPending, startTransition] = useTransition()

  const materialMap = useMemo(() => new Map(materiales.map(material => [material.id, material])), [materiales])

  const costoMateriales = items.reduce((sum, item) => {
    if (item.materialId === '') return sum
    const material = materialMap.get(item.materialId)
    return sum + (material ? material.precio * item.cantidad : 0)
  }, 0)

  const precioVenta = roundSuggestedPrice(costoMateriales * (1 + margen / 100))

  function openModal() {
    setItems(toEditableItems(initialItems))
    setError('')
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setError('')
  }

  function addItem() {
    setItems(prev => [...prev, { materialId: '', cantidad: 1 }])
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  function updateItemMaterial(index: number, materialId: number | '') {
    setItems(prev => prev.map((item, currentIndex) => currentIndex === index ? { ...item, materialId } : item))
  }

  function updateItemCantidad(index: number, cantidad: number) {
    setItems(prev => prev.map((item, currentIndex) => currentIndex === index ? { ...item, cantidad } : item))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const payload = items
      .filter(item => item.materialId !== '' && item.cantidad > 0)
      .map(item => ({ materialId: item.materialId as number, cantidad: item.cantidad }))

    startTransition(async () => {
      const res = await updateProductoDetalle({
        productoId,
        items: payload,
      })

      if (res?.error) {
        setError(res.error)
        return
      }

      closeModal()
      setToast({ message: 'Producto actualizado', type: 'success' })
      router.refresh()
    })
  }

  const clearToast = useCallback(() => setToast(null), [])

  return (
    <>
      <button
        onClick={openModal}
        className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition-all hover:border-violet-300 hover:bg-violet-100"
      >
        Editar materiales y precio
      </button>

      <Modal open={open} onClose={closeModal} title="Editar producto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700">Materiales</label>
              <button
                type="button"
                onClick={addItem}
                className="rounded-lg border border-violet-200 px-3 py-1 text-xs font-semibold text-violet-700 transition-all hover:border-violet-300 hover:bg-violet-50"
              >
                + Agregar
              </button>
            </div>

            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {items.map((item, index) => {
                const material = item.materialId === '' ? null : materialMap.get(item.materialId)
                const subtotal = material ? material.precio * item.cantidad : 0

                return (
                  <div key={`${index}-${item.materialId || 'empty'}`} className="rounded-xl border border-gray-200 p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_110px_auto] sm:items-end">
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Material</label>
                        <select
                          value={item.materialId}
                          onChange={e => updateItemMaterial(index, e.target.value === '' ? '' : Number.parseInt(e.target.value, 10))}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
                        >
                          <option value="">Seleccionar...</option>
                          {materiales.map(option => (
                            <option key={option.id} value={option.id}>
                              {option.nombre} ({option.unidad})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Cantidad</label>
                        <input
                          type="number"
                          value={item.cantidad || ''}
                          min="0"
                          step="0.01"
                          onChange={e => updateItemCantidad(index, Number.parseFloat(e.target.value) || 0)}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="rounded-lg px-3 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                      >
                        Quitar
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                      <span>{material ? `Precio unitario: ${fmoney(material.precio)}` : 'Seleccioná un material'}</span>
                      <span className="font-mono font-semibold text-gray-700">{subtotal > 0 ? `Subtotal: ${fmoney(subtotal)}` : 'Subtotal: -'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Costo de materiales actualizado</span>
                <span className="font-mono font-semibold text-gray-900">{fmoney(costoMateriales)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-gray-200 pt-2">
                <span className="text-gray-500">Precio sugerido automatico ({margen}%)</span>
                <span className="font-mono text-base font-extrabold text-violet-700">{fmoney(precioVenta)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs text-violet-700">
            El precio de venta se recalcula automaticamente segun los materiales y el margen actual del producto.
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
              {isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </>
  )
}

function toEditableItems(initialItems: ProductoMaterial[]): EditableItem[] {
  if (initialItems.length === 0) {
    return [{ materialId: '', cantidad: 1 }]
  }

  return initialItems.map(item => ({
    materialId: item.material_id,
    cantidad: item.cantidad,
  }))
}
