import { getProveedores } from '@/lib/actions/proveedores'
import { getMaterialesPage } from '@/lib/actions/materiales'
import MaterialesClient from '@/components/materiales/materiales-client'

export default async function MaterialesPage() {
  const [{ materiales, total }, proveedores] = await Promise.all([
    getMaterialesPage(0, 15),
    getProveedores(),
  ])

  return <MaterialesClient initialMateriales={materiales} initialTotal={total} proveedores={proveedores} />
}
