import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProductoDetalle } from '@/lib/actions/productos'
import StockEditor from '@/components/productos/stock-editor'
import type { ProductoMaterial } from '@/types'

function fmoney(n: number) {
  return '$ ' + n.toLocaleString('es-AR', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export default async function ProductoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const producto = await getProductoDetalle(parseInt(id))
  if (!producto) notFound()

  const pm = producto.producto_materiales ?? []

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/productos" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-600 mb-6 transition-colors">
        ← Volver al stock
      </Link>

      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl p-6 text-white mb-6 shadow-lg">
        <p className="text-xs uppercase tracking-widest text-white/60 mb-1">Producto</p>
        <h1 className="text-2xl font-extrabold tracking-tight mb-3">{producto.nombre}</h1>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-white/60">Precio de venta</p>
            <p className="text-3xl font-extrabold">{fmoney(producto.precio_venta)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-white/60 mb-1">Stock actual</p>
            <StockEditor productoId={producto.id} initialStock={producto.stock} />
          </div>
        </div>
      </div>

      {/* Materials breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📦 Composición de materiales</h2>
        {pm.length === 0 ? (
          <p className="text-sm text-gray-400">Sin materiales registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-2">Material</th>
                  <th className="text-center pb-2 w-20">Unidad</th>
                  <th className="text-right pb-2 w-24">Cantidad</th>
                  <th className="text-right pb-2 w-28">Precio unit.</th>
                  <th className="text-right pb-2 w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pm.map((item: ProductoMaterial) => (
                  <tr key={item.id}>
                    <td className="py-2.5 pr-2 font-medium text-gray-900">
                      {item.material?.nombre ?? '—'}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="inline-block bg-violet-50 text-violet-700 text-xs font-mono font-semibold px-2 py-0.5 rounded-md">
                        {item.material?.unidad ?? '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-gray-700">{item.cantidad}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-gray-500">{fmoney(item.precio_unitario)}</td>
                    <td className="py-2.5 pl-2 text-right font-mono font-semibold text-gray-900">{fmoney(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cost breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">💰 Desglose de costos</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Materiales', value: fmoney(producto.costo_materiales) },
            { label: `Mano de obra (${producto.horas_mo}h × ${fmoney(producto.valor_hora)})`, value: fmoney(producto.costo_mo) },
            { label: 'Gastos generales', value: fmoney(producto.gastos_generales) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">{label}</span>
              <span className="font-mono font-semibold text-gray-900">{value}</span>
            </div>
          ))}
          <div className="flex justify-between items-center py-2 border-b-2 border-gray-200 font-bold">
            <span className="text-gray-900">Costo total</span>
            <span className="font-mono text-gray-900">{fmoney(producto.costo_total)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span className="text-gray-500">Ganancia ({producto.margen}%)</span>
            <span className="font-mono font-semibold text-green-600">
              {fmoney(producto.costo_total * (producto.margen / 100))}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 bg-violet-50 rounded-xl px-3 mt-2">
            <span className="font-bold text-violet-800">Precio de venta</span>
            <span className="font-mono font-extrabold text-violet-800 text-lg">{fmoney(producto.precio_venta)}</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Creado el {new Date(producto.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
