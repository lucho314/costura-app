import { getMovimientosPage, getEstadisticas } from '@/lib/actions/movimientos'
import { getProductosParaMovimientos } from '@/lib/actions/productos'
import MovimientosClient from '@/components/movimientos/movimientos-client'

export default async function MovimientosPage() {
  const [{ movimientos, total }, estadisticas, productos] = await Promise.all([
    getMovimientosPage(0, 30),
    getEstadisticas(),
    getProductosParaMovimientos(),
  ])

  return (
    <MovimientosClient
      initialMovimientos={movimientos}
      initialTotal={total}
      estadisticas={estadisticas}
      productos={productos}
    />
  )
}
