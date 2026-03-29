import { getMateriales } from '@/lib/actions/materiales'
import MaterialesClient from '@/components/materiales/materiales-client'

export default async function MaterialesPage() {
  const materiales = await getMateriales()

  return <MaterialesClient materiales={materiales} />
}
