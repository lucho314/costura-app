import ProveedoresClient from '@/components/proveedores/proveedores-client'
import { getProveedoresPage } from '@/lib/actions/proveedores'

export default async function ProveedoresPage() {
  const { proveedores, total } = await getProveedoresPage(0, 10)

  return <ProveedoresClient initialProveedores={proveedores} initialTotal={total} />
}
