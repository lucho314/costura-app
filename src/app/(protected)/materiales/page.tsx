import { getProveedores } from '@/lib/actions/proveedores'
import { getMateriales } from '@/lib/actions/materiales'
import MaterialesClient from '@/components/materiales/materiales-client'

export default async function MaterialesPage() {
  const [materiales, proveedores] = await Promise.all([
    getMateriales(),
    getProveedores(),
  ])

  return <MaterialesClient materiales={materiales} proveedores={proveedores} />
}
