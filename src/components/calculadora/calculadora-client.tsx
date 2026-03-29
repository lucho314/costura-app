'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { saveProducto } from '@/lib/actions/productos'
import type { Material, CalcItem } from '@/types'
import Toast from '@/components/ui/toast'

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

export default function CalculadoraClient({ materiales }: { materiales: Material[] }) {
  const router = useRouter()
  const [items, setItems] = useState<CalcItem[]>([{ materialId: '', cantidad: 1 }])
  const [nombre, setNombre] = useState('')
  const [horasMO, setHorasMO] = useState(0)
  const [valorHora, setValorHora] = useState(0)
  const [gastosGen, setGastosGen] = useState(0)
  const [margen, setMargen] = useState(35)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [saveError, setSaveError] = useState('')
  const [isPending, startTransition] = useTransition()

  // Calculations
  const costoMateriales = items.reduce((sum, item) => {
    if (item.materialId === '') return sum
    const mat = materiales.find(m => m.id === item.materialId)
    return sum + (mat ? mat.precio * item.cantidad : 0)
  }, 0)

  const costoMO = horasMO * valorHora
  const costoTotal = costoMateriales + costoMO + gastosGen
  const margenValor = costoTotal * (margen / 100)
  const precioVenta = costoTotal * (1 + margen / 100)

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
    if (!confirm('¿Limpiar la calculadora?')) return
    setItems([{ materialId: '', cantidad: 1 }])
    setNombre('')
    setHorasMO(0)
    setValorHora(0)
    setGastosGen(0)
    setMargen(35)
    setSaveError('')
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
      } else {
        setToast({ message: '¡Producto guardado en stock!', type: 'success' })
        setTimeout(() => router.push(`/productos/${res.id}`), 1500)
      }
    })
  }

  const clearToast = useCallback(() => setToast(null), [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Left — Form */}
      <div className="lg:col-span-2 flex flex-col gap-5">

        {/* Product name */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            ✂️ Nombre del producto
          </h3>
          <input
            type="text"
            placeholder="Ej: Pantalón de algodón"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
          />
        </div>

        {/* Materials */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">📦 Materiales usados</h3>
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700 font-semibold border border-violet-200 hover:border-violet-400 px-3 py-1.5 rounded-lg transition-all"
            >
              + Agregar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-2 pr-2">Material</th>
                  <th className="text-right pb-2 px-2 w-36">Cantidad</th>
                  <th className="text-right pb-2 px-2 w-28 hidden sm:table-cell">Precio unit.</th>
                  <th className="text-right pb-2 px-2 w-28">Subtotal</th>
                  <th className="w-8 pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-300 text-sm">
                      No hay materiales. Hacé clic en "+ Agregar".
                    </td>
                  </tr>
                ) : items.map((item, i) => {
                  const mat = materiales.find(m => m.id === item.materialId)
                  const subtotal = mat ? mat.precio * item.cantidad : 0
                  return (
                    <tr key={i}>
                      <td className="py-2 pr-2">
                        <select
                          value={item.materialId}
                          onChange={e => updateItemMaterial(i, e.target.value === '' ? '' : parseInt(e.target.value))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white min-w-32"
                        >
                          <option value="">— elegir —</option>
                          {materiales.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.nombre} ({m.unidad})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2 w-36">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-violet-200">
                          <input
                            type="number"
                            value={item.cantidad || ''}
                            min="0"
                            step="0.01"
                            onChange={e => updateItemCantidad(i, parseFloat(e.target.value) || 0)}
                            className="flex-1 px-2 py-2 text-sm text-right focus:outline-none min-w-0 w-16"
                          />
                          {mat && (
                            <span className="px-2 text-xs text-gray-400 font-mono bg-gray-50 border-l border-gray-200 py-2 shrink-0">
                              {mat.unidad}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-xs text-gray-400 hidden sm:table-cell">
                        {mat ? fmoney(mat.precio) : '—'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-semibold text-sm text-gray-900">
                        {subtotal > 0 ? fmoney(subtotal) : '—'}
                      </td>
                      <td className="py-2 pl-2">
                        <button
                          onClick={() => removeItem(i)}
                          className="text-gray-300 hover:text-red-500 transition-colors font-bold"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total materiales</p>
              <p className="text-2xl font-bold text-gray-900">{fmoney(costoMateriales)}</p>
            </div>
          </div>
        </div>

        {/* Additional costs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">⚙️ Costos adicionales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horas de mano de obra</label>
              <input
                type="number"
                value={horasMO || ''}
                min="0"
                step="0.5"
                placeholder="0"
                onChange={e => setHorasMO(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor por hora ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={valorHora || ''}
                  min="0"
                  placeholder="0"
                  onChange={e => setValorHora(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Gastos generales (monto fijo)</label>
              <div className="relative max-w-sm">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={gastosGen || ''}
                  min="0"
                  placeholder="0"
                  onChange={e => setGastosGen(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total adicionales</p>
              <p className="text-2xl font-bold text-gray-900">{fmoney(costoMO + gastosGen)}</p>
            </div>
          </div>
        </div>

        {/* Margin */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📈 Margen de ganancia</h3>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="200"
              value={margen}
              onChange={e => setMargen(parseInt(e.target.value))}
              className="flex-1 accent-violet-600"
            />
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                value={margen}
                min="0"
                max="200"
                onChange={e => setMargen(Math.max(0, Math.min(200, parseInt(e.target.value) || 0)))}
                className="w-20 border border-gray-200 rounded-xl px-2 py-2 text-center font-bold text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <span className="font-bold text-gray-500 text-lg">%</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Precio = Costo total × (1 + margen%)</p>
        </div>

      </div>

      {/* Right — Summary */}
      <div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 lg:sticky lg:top-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">💰 Resumen</h3>

          <div className="space-y-2 text-sm">
            {[
              { label: 'Total materiales', value: fmoney(costoMateriales) },
              { label: 'Mano de obra', value: fmoney(costoMO) },
              { label: 'Gastos generales', value: fmoney(gastosGen) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold font-mono text-gray-900">{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center py-2 border-b-2 border-gray-200">
              <span className="font-bold text-gray-900">Costo total</span>
              <span className="font-bold font-mono text-gray-900">{fmoney(costoTotal)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Ganancia ({margen}%)</span>
              <span className="font-semibold font-mono text-green-600">{fmoney(margenValor)}</span>
            </div>
          </div>

          {/* Price card */}
          <div className="mt-5 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-5 text-white text-center shadow-lg">
            <p className="text-xs uppercase tracking-widest text-white/60 mb-1">Producto</p>
            <p className="font-semibold text-white/90 mb-3 truncate">{nombre || 'Mi producto'}</p>
            <p className="text-xs uppercase tracking-widest text-white/60 mb-1">Precio sugerido</p>
            <p className="text-4xl font-extrabold tracking-tight">{fmoney(precioVenta)}</p>
          </div>

          {/* Save error */}
          {saveError && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {saveError}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-xl py-2 transition-all"
            >
              🗑️ Limpiar
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl py-2 shadow-sm transition-all disabled:opacity-60"
            >
              {isPending ? 'Guardando...' : '💾 Guardar producto'}
            </button>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </div>
  )
}
