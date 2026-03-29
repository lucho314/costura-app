import { getMateriales } from '@/lib/actions/materiales'
import CalculadoraClient from '@/components/calculadora/calculadora-client'

export default async function CalculadoraPage() {
  const materiales = await getMateriales()

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Calculadora de Productos</h2>
        <p className="text-sm text-gray-500">Calculá el costo y precio sugerido, luego guardá en stock.</p>
      </div>
      <CalculadoraClient materiales={materiales} />
    </div>
  )
}
