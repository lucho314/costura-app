import CalculadoraClient from '@/components/calculadora/calculadora-client'
import { getMateriales } from '@/lib/actions/materiales'

export default async function CalculadoraPage() {
  const materiales = await getMateriales()

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Crear producto</h2>
        <p className="text-sm text-gray-500">Calcula el costo y el precio sugerido, suma fotos y luego guardalo en stock.</p>
      </div>
      <CalculadoraClient materiales={materiales} />
    </div>
  )
}
