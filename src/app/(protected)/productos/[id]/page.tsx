import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMateriales } from '@/lib/actions/materiales'
import ProductoImageSlider from '@/components/productos/producto-image-slider'
import ProductoDetailEditor from '@/components/productos/producto-detail-editor'
import ProductoImageUploader from '@/components/productos/producto-image-uploader'
import StockEditor from '@/components/productos/stock-editor'
import { getProductoDetalle } from '@/lib/actions/productos'
import { formatLongDate, formatMoney } from '@/lib/format'
import type { ProductoMaterial } from '@/types'

export default async function ProductoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const productoId = Number.parseInt(id, 10)
  const [producto, materiales] = await Promise.all([
    getProductoDetalle(productoId),
    getMateriales(),
  ])

  if (!producto) notFound()

  const pm = producto.producto_materiales ?? []
  const imagenes = producto.producto_imagenes ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/productos" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-violet-600">
        ← Volver al stock
      </Link>

      <div className="mb-6 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-6 text-white shadow-lg">
        <p className="mb-1 text-xs uppercase tracking-widest text-white/60">Producto</p>
        <h1 className="mb-3 text-2xl font-extrabold tracking-tight">{producto.nombre}</h1>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-white/60">Precio de venta</p>
            <p className="text-3xl font-extrabold">{formatMoney(producto.precio_venta)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="mb-1 text-xs text-white/60">Stock actual</p>
            <StockEditor productoId={producto.id} initialStock={producto.stock} />
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-bold text-gray-800">Fotos del producto</h2>
          <p className="text-sm text-gray-500">
            {imagenes.length > 0
              ? `${imagenes.length} foto${imagenes.length !== 1 ? 's' : ''} cargada${imagenes.length !== 1 ? 's' : ''}`
              : 'Todavia no hay imagenes para este producto.'}
          </p>
        </div>
        <ProductoImageSlider imagenes={imagenes} productoId={producto.id} />
        <ProductoImageUploader productoId={producto.id} existingCount={imagenes.length} />
      </div>

      <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-gray-800">Composicion de materiales</h2>
            <p className="text-sm text-gray-500">Podés editar la composición del producto y ajustar el precio de venta.</p>
          </div>
          <ProductoDetailEditor
            key={`${producto.id}-${producto.precio_venta}-${pm.length}`}
            productoId={producto.id}
            materiales={materiales}
            initialItems={pm}
            margen={producto.margen}
            horasMo={producto.horas_mo}
            valorHora={producto.valor_hora}
            gastosGenerales={producto.gastos_generales}
          />
        </div>
        {pm.length === 0 ? (
          <p className="text-sm text-gray-400">Sin materiales registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                  <th className="pb-2 text-left">Material</th>
                  <th className="w-20 pb-2 text-center">Unidad</th>
                  <th className="w-24 pb-2 text-right">Cantidad</th>
                  <th className="w-28 pb-2 text-right">Precio unit.</th>
                  <th className="w-28 pb-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pm.map((item: ProductoMaterial) => (
                  <tr key={item.id}>
                    <td className="py-2.5 pr-2 font-medium text-gray-900">
                      {item.material?.nombre ?? '-'}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className="inline-block rounded-md bg-violet-50 px-2 py-0.5 text-xs font-mono font-semibold text-violet-700">
                        {item.material?.unidad ?? '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-gray-700">{item.cantidad}</td>
                    <td className="px-2 py-2.5 text-right font-mono text-gray-500">{formatMoney(item.precio_unitario)}</td>
                    <td className="py-2.5 pl-2 text-right font-mono font-semibold text-gray-900">{formatMoney(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-gray-800">Desglose de costos</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Materiales', value: formatMoney(producto.costo_materiales) },
            { label: `Mano de obra (${producto.horas_mo}h x ${formatMoney(producto.valor_hora)})`, value: formatMoney(producto.costo_mo) },
            { label: 'Gastos generales', value: formatMoney(producto.gastos_generales) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between border-b border-gray-50 py-2">
              <span className="text-gray-500">{label}</span>
              <span className="font-mono font-semibold text-gray-900">{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-b-2 border-gray-200 py-2 font-bold">
            <span className="text-gray-900">Costo total</span>
            <span className="font-mono text-gray-900">{formatMoney(producto.costo_total)}</span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-50 py-2">
            <span className="text-gray-500">Ganancia actual</span>
            <span className="font-mono font-semibold text-green-600">
              {formatMoney(producto.precio_venta - producto.costo_total)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl bg-violet-50 px-3 py-3">
            <span className="font-bold text-violet-800">Precio de venta</span>
            <span className="text-lg font-mono font-extrabold text-violet-800">{formatMoney(producto.precio_venta)}</span>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Creado el {formatLongDate(producto.created_at)}
        </p>
      </div>
    </div>
  )
}
