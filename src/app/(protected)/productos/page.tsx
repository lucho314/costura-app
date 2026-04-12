import { getProductosPage } from '@/lib/actions/productos'
import ProductosClient from '@/components/productos/productos-client'

export default async function ProductosPage() {
  const { productos, total } = await getProductosPage(0, 9)

  return <ProductosClient initialProductos={productos} initialTotal={total} />
}
