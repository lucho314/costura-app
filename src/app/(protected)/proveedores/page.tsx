import ProveedoresClient from '@/components/proveedores/proveedores-client'
import { getProveedores } from '@/lib/actions/proveedores'

export default async function ProveedoresPage() {
  const proveedores = await getProveedores()

  return <ProveedoresClient proveedores={proveedores} />
}
