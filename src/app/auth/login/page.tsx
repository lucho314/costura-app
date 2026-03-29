import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginButton from '@/components/auth/login-button'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (data.user) redirect('/materiales')

  const params = await searchParams
  const hasError = params.error === 'auth'

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-5xl select-none">🧵</div>
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Gestión de Materiales
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Inventario, calculadora y stock de productos
          </p>
        </div>

        {hasError && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            Ocurrió un error al iniciar sesión. Intentá de nuevo.
          </div>
        )}

        <LoginButton />

        <p className="text-xs text-gray-400 text-center">
          Al iniciar sesión aceptás el uso de tus datos para gestionar tu inventario.
        </p>
      </div>
    </div>
  )
}
