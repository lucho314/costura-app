import { getMovimientos, getEstadisticas } from '@/lib/actions/movimientos'
import { getProductos } from '@/lib/actions/productos'
import MovimientosClient from '@/components/movimientos/movimientos-client'

export default async function MovimientosPage() {
  const [movimientos, estadisticas, productos] = await Promise.all([
    getMovimientos(),
    getEstadisticas(),
    getProductos(),
  ])

  return (
    <MovimientosClient
      movimientos={movimientos}
      estadisticas={estadisticas}
      productos={productos}
    />
  )
}
