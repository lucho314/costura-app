'use client'

import { useState, useTransition } from 'react'
import Modal from '@/components/ui/modal'
import { registrarMovimiento } from '@/lib/actions/movimientos'
import type { Producto, TipoMovimiento } from '@/types'

function fmoney(n: number) {
  return '$ ' + n.toLocaleString('es-AR', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export default function MovimientoForm({
  productos,
  open,
  onClose,
  onSuccess,
}: {
  productos: Producto[]
  open: boolean
  onClose: () => void
  onSuccess: (message: string) => void
}) {
  const [productoId, setProductoId] = useState<number | ''>('')
  const [tipo, setTipo] = useState<TipoMovimiento>('venta')
  const [cantidad, setCantidad] = useState(1)
  const [precioVenta, setPrecioVenta] = useState<number | ''>('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const productoSeleccionado = productoId === '' ? null : productos.find(p => p.id === productoId)
  const stockNuevo = productoSeleccionado ? (
    tipo === 'venta' ? productoSeleccionado.stock - cantidad :
    tipo === 'produccion' ? productoSeleccionado.stock + cantidad :
    productoSeleccionado.stock
  ) : 0

  const gananciaCalculada = tipo === 'venta' && productoSeleccionado && precioVenta !== ''
    ? Number(precioVenta) - productoSeleccionado.costo_total
    : null

  const gananciaProyectada = productoSeleccionado
    ? productoSeleccionado.precio_venta - productoSeleccionado.costo_total
    : null

  function handleClose() {
    setProductoId('')
    setTipo('venta')
    setCantidad(1)
    setPrecioVenta('')
    setNotas('')
    setError('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (productoId === '') {
      setError('Selecciona un producto')
      return
    }

    if (cantidad <= 0) {
      setError('La cantidad debe ser mayor a 0')
      return
    }

    if (tipo === 'venta' && precioVenta === '') {
      setError('Ingresa el precio de venta')
      return
    }

    if (tipo === 'venta' && productoSeleccionado && cantidad > productoSeleccionado.stock) {
      setError(`Stock insuficiente. Disponible: ${productoSeleccionado.stock}`)
      return
    }

    startTransition(async () => {
      const res = await registrarMovimiento({
        productoId: Number(productoId),
        tipo,
        cantidad,
        precioVenta: precioVenta === '' ? undefined : Number(precioVenta),
        notas: notas.trim() || undefined,
      })

      if (res?.error) {
        setError(res.error)
        return
      }

      handleClose()
      const tipoLabel = tipo === 'venta' ? 'Venta' : tipo === 'produccion' ? 'Producción' : 'Ajuste'
      onSuccess(`${tipoLabel} registrada correctamente`)
    })
  }

  return (
    <Modal open={open} onClose={handleClose} title="Registrar movimiento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Producto
          </label>
          <select
            value={productoId}
            onChange={e => {
              const newProductoId = e.target.value === '' ? '' : Number(e.target.value)
              setProductoId(newProductoId)
              // Pre-llenar precio de venta con el precio sugerido
              const producto = newProductoId === '' ? null : productos.find(p => p.id === newProductoId)
              if (producto && tipo === 'venta') {
                setPrecioVenta(producto.precio_venta)
              }
            }}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="">Seleccionar producto...</option>
            {productos.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre} (Stock: {p.stock})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Tipo de movimiento
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setTipo('venta')
                if (productoSeleccionado) {
                  setPrecioVenta(productoSeleccionado.precio_venta)
                }
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                tipo === 'venta'
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              Venta
            </button>
            <button
              type="button"
              onClick={() => {
                setTipo('produccion')
                setPrecioVenta('')
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                tipo === 'produccion'
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              Producción
            </button>
            <button
              type="button"
              onClick={() => {
                setTipo('ajuste')
                setPrecioVenta('')
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                tipo === 'ajuste'
                  ? 'border-yellow-300 bg-yellow-50 text-yellow-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              Ajuste
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Cantidad
          </label>
          <input
            type="number"
            value={cantidad || ''}
            min="1"
            step="1"
            onChange={e => setCantidad(Number.parseInt(e.target.value) || 0)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>

        {tipo === 'venta' && (
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Precio de venta
            </label>
            <input
              type="number"
              value={precioVenta || ''}
              min="0"
              step="0.01"
              onChange={e => setPrecioVenta(e.target.value === '' ? '' : Number.parseFloat(e.target.value))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
              placeholder={productoSeleccionado ? fmoney(productoSeleccionado.precio_venta) : ''}
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Notas (opcional)
          </label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="Ej: Venta a cliente X, ajuste por inventario..."
          />
        </div>

        {productoSeleccionado && (
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Stock actual</span>
              <span className="font-mono font-semibold text-gray-900">{productoSeleccionado.stock}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-gray-500">Stock después</span>
              <span className={`font-mono font-bold ${stockNuevo < 0 ? 'text-red-600' : 'text-violet-700'}`}>
                {stockNuevo}
              </span>
            </div>
            {tipo === 'venta' && gananciaCalculada !== null && gananciaProyectada !== null && (
              <>
                <div className="mt-2 border-t border-gray-200 pt-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">Ganancia real</span>
                    <span className={`font-mono font-semibold ${gananciaCalculada >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmoney(gananciaCalculada)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="text-gray-500">Ganancia proyectada</span>
                    <span className="font-mono text-gray-600">{fmoney(gananciaProyectada)}</span>
                  </div>
                </div>
                {gananciaCalculada < gananciaProyectada && (
                  <div className="mt-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                    Estás vendiendo con descuento ({fmoney(gananciaProyectada - gananciaCalculada)} menos)
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:text-gray-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
          >
            {isPending ? 'Registrando...' : 'Registrar movimiento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
