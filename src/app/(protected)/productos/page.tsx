import { getProductos } from '@/lib/actions/productos'
import ProductosClient from '@/components/productos/productos-client'

export default async function ProductosPage() {
  const productos = await getProductos()

  return <ProductosClient productos={productos} />
}
