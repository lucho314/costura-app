'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveProducto } from '@/lib/actions/productos'
import { formatMoney } from '@/lib/format'
import { optimizeImagesForUpload } from '@/lib/image-optimizer'
import type { CalcItem, Material } from '@/types'
import Toast from '@/components/ui/toast'

interface ToastState {
  message: string
  type: 'success' | 'error'
}

const MAX_FILES = 6

function roundSuggestedPrice(n: number) {
  const hasDecimals = n % 1 !== 0
  const step = hasDecimals ? 50 : 10

  return Math.ceil(n / step) * step
}

export default function CalculadoraClient({ materiales }: { materiales: Material[] }) {
  const router = useRouter()
  const [items, setItems] = useState<CalcItem[]>([{ materialId: '', cantidad: 1 }])
  const [nombre, setNombre] = useState('')
  const [fotos, setFotos] = useState<File[]>([])
  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [horasMO, setHorasMO] = useState(0)
  const [valorHora, setValorHora] = useState(0)
  const [gastosGen, setGastosGen] = useState(0)
  const [margen, setMargen] = useState(35)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [saveError, setSaveError] = useState('')
  const [isPending, startTransition] = useTransition()
  const materialMap = useMemo(() => new Map(materiales.map(material => [material.id, material])), [materiales])

  const costoMateriales = items.reduce((sum, item) => {
    if (item.materialId === '') return sum
    const mat = materialMap.get(item.materialId)
    return sum + (mat ? mat.precio * item.cantidad : 0)
  }, 0)

  const costoMO = horasMO * valorHora
  const costoTotal = costoMateriales + costoMO + gastosGen
  const precioVentaBase = costoTotal * (1 + margen / 100)
  const precioVenta = roundSuggestedPrice(precioVentaBase)
  const margenValor = precioVenta - costoTotal

  function addItem() {
    setItems(prev => [...prev, { materialId: '', cantidad: 1 }])
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateItemMaterial(i: number, materialId: number | '') {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, materialId } : item))
  }

  function updateItemCantidad(i: number, cantidad: number) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, cantidad } : item))
  }

  function handleReset() {
    if (!confirm('¿Limpiar el formulario del producto?')) return

    setItems([{ materialId: '', cantidad: 1 }])
    setNombre('')
    setFotos([])
    setPhotoInputKey(prev => prev + 1)
    setHorasMO(0)
    setValorHora(0)
    setGastosGen(0)
    setMargen(35)
    setSaveError('')
  }

  function handlePhotoSelection(fileList: FileList | null) {
    if (!fileList) {
      return
    }

    setSaveError('')

    const selected = Array.from(fileList).filter(file => file.type.startsWith('image/'))

    setFotos(prev => {
      const existingKeys = new Set(prev.map(file => `${file.name}-${file.size}-${file.lastModified}`))
      const next = [...prev]

      for (const file of selected) {
        const key = `${file.name}-${file.size}-${file.lastModified}`
        if (existingKeys.has(key)) continue
        if (next.length >= MAX_FILES) break

        existingKeys.add(key)
        next.push(file)
      }

      if (next.length === MAX_FILES && prev.length + selected.length > MAX_FILES) {
        setSaveError(`Solo podes cargar hasta ${MAX_FILES} imagenes.`)
      }

      return next
    })

    setPhotoInputKey(prev => prev + 1)
  }

  function removePhoto(index: number) {
    setFotos(prev => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  function handleSave() {
    setSaveError('')

    startTransition(async () => {
      const res = await saveProducto({
        nombre,
        items,
        horas_mo: horasMO,
        valor_hora: valorHora,
        gastos_generales: gastosGen,
        margen,
      })

      if (res?.error) {
        setSaveError(res.error)
        return
      }

      if (fotos.length > 0) {
        const formData = new FormData()
        const optimizedFotos = await optimizeImagesForUpload(fotos)

        optimizedFotos.forEach(file => {
          formData.append('files', file)
        })

        const uploadResponse = await fetch(`/api/productos/${res.id}/imagenes`, {
          method: 'POST',
          body: formData,
        })

        const uploadResult = await uploadResponse.json()

        if (!uploadResponse.ok) {
          setToast({ message: 'Producto guardado, pero hubo un problema subiendo las fotos.', type: 'error' })
          setSaveError(uploadResult.error ?? 'No se pudieron subir las fotos.')
          setTimeout(() => router.push(`/productos/${res.id}`), 2200)
          return
        }
      }

      setToast({
        message: fotos.length > 0
          ? `Producto guardado con ${fotos.length} foto${fotos.length !== 1 ? 's' : ''}.`
          : 'Producto guardado en stock.',
        type: 'success',
      })

      setTimeout(() => router.push(`/productos/${res.id}`), 1500)
    })
  }

  const clearToast = useCallback(() => setToast(null), [])

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-5 lg:col-span-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-bold text-gray-800">Nombre del producto</h3>
          <input
            type="text"
            placeholder="Ej: Pantalon de algodon"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-800">Fotos del producto</h3>
              <p className="text-sm text-gray-500">Podes subir hasta 6 imagenes para ver luego en stock como slider.</p>
            </div>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
              {fotos.length}/{MAX_FILES}
            </span>
          </div>

          <input
            key={photoInputKey}
            type="file"
            accept="image/*"
            multiple
            onChange={e => handlePhotoSelection(e.target.files)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:font-semibold file:text-violet-700 hover:file:bg-violet-100"
          />

          {fotos.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {fotos.map((file, index) => (
                <div
                  key={`${file.name}-${file.lastModified}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-500">{Math.round(file.size / 1024)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="shrink-0 text-xs font-semibold text-red-500 transition hover:text-red-700"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Materiales usados</h3>
            <button
              onClick={addItem}
              className="rounded-lg border border-violet-200 px-3 py-1.5 text-sm font-semibold text-violet-600 transition-all hover:border-violet-400 hover:text-violet-700"
            >
              + Agregar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                  <th className="pb-2 pr-2 text-left">Material</th>
                  <th className="w-36 px-2 pb-2 text-right">Cantidad</th>
                  <th className="hidden w-28 px-2 pb-2 text-right sm:table-cell">Precio unit.</th>
                  <th className="w-28 px-2 pb-2 text-right">Subtotal</th>
                  <th className="w-8 pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-gray-300">
                      No hay materiales. Hace clic en &quot;+ Agregar&quot;.
                    </td>
                  </tr>
                ) : items.map((item, i) => {
                  const mat = item.materialId === '' ? undefined : materialMap.get(item.materialId)
                  const subtotal = mat ? mat.precio * item.cantidad : 0

                  return (
                    <tr key={i}>
                      <td className="py-2 pr-2">
                        <select
                          value={item.materialId}
                          onChange={e => updateItemMaterial(i, e.target.value === '' ? '' : Number.parseInt(e.target.value, 10))}
                          className="min-w-32 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                        >
                          <option value="">- elegir -</option>
                          {materiales.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.nombre} ({m.unidad})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="w-36 px-2 py-2">
                        <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-violet-200">
                          <input
                            type="number"
                            value={item.cantidad || ''}
                            min="0"
                            step="0.01"
                            onChange={e => updateItemCantidad(i, Number.parseFloat(e.target.value) || 0)}
                            className="min-w-0 w-16 flex-1 px-2 py-2 text-right text-sm focus:outline-none"
                          />
                          {mat && (
                            <span className="shrink-0 border-l border-gray-200 bg-gray-50 px-2 py-2 font-mono text-xs text-gray-400">
                              {mat.unidad}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-2 py-2 text-right font-mono text-xs text-gray-400 sm:table-cell">
                        {mat ? formatMoney(mat.precio) : '-'}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-sm font-semibold text-gray-900">
                        {subtotal > 0 ? formatMoney(subtotal) : '-'}
                      </td>
                      <td className="py-2 pl-2">
                        <button
                          onClick={() => removeItem(i)}
                          className="font-bold text-gray-300 transition-colors hover:text-red-500"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-gray-400">Total materiales</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(costoMateriales)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-gray-800">Costos adicionales</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Horas de mano de obra</label>
              <input
                type="number"
                value={horasMO || ''}
                min="0"
                step="0.5"
                placeholder="0"
                onChange={e => setHorasMO(Number.parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Valor por hora ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  type="number"
                  value={valorHora || ''}
                  min="0"
                  placeholder="0"
                  onChange={e => setValorHora(Number.parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Gastos generales (monto fijo)</label>
              <div className="relative max-w-sm">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  type="number"
                  value={gastosGen || ''}
                  min="0"
                  placeholder="0"
                  onChange={e => setGastosGen(Number.parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-gray-400">Total adicionales</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(costoMO + gastosGen)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-gray-800">Margen de ganancia</h3>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="200"
              value={margen}
              onChange={e => setMargen(Number.parseInt(e.target.value, 10))}
              className="flex-1 accent-violet-600"
            />
            <div className="flex shrink-0 items-center gap-1">
              <input
                type="number"
                value={margen}
                min="0"
                max="200"
                onChange={e => setMargen(Math.max(0, Math.min(200, Number.parseInt(e.target.value, 10) || 0)))}
                className="w-20 rounded-xl border border-gray-200 px-2 py-2 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <span className="text-lg font-bold text-gray-500">%</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">Precio = costo total x (1 + margen%), redondeado hacia arriba</p>
        </div>
      </div>

      <div>
        <div className="sticky top-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-gray-800">Resumen</h3>

          <div className="space-y-2 text-sm">
            {[
              { label: 'Total materiales', value: formatMoney(costoMateriales) },
              { label: 'Mano de obra', value: formatMoney(costoMO) },
              { label: 'Gastos generales', value: formatMoney(gastosGen) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between border-b border-gray-100 py-2">
                <span className="text-gray-500">{label}</span>
                <span className="font-mono font-semibold text-gray-900">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-b-2 border-gray-200 py-2">
              <span className="font-bold text-gray-900">Costo total</span>
              <span className="font-mono font-bold text-gray-900">{formatMoney(costoTotal)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-500">Ganancia ({margen}%)</span>
              <span className="font-mono font-semibold text-green-600">{formatMoney(margenValor)}</span>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-5 text-center text-white shadow-lg">
            <p className="mb-1 text-xs uppercase tracking-widest text-white/60">Producto</p>
            <p className="mb-3 truncate font-semibold text-white/90">{nombre || 'Mi producto'}</p>
            <p className="mb-1 text-xs uppercase tracking-widest text-white/60">Precio sugerido</p>
            <p className="text-4xl font-extrabold tracking-tight">{formatMoney(precioVenta)}</p>
          </div>

          {saveError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 rounded-xl border border-gray-200 py-2 text-sm text-gray-500 transition-all hover:border-gray-300 hover:text-gray-700"
            >
              Limpiar
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
            >
              {isPending ? 'Guardando...' : 'Guardar producto'}
            </button>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </div>
  )
}
