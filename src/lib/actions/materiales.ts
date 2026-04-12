'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Unidad } from '@/types'

async function recalculateProductsForMaterial(userId: string, materialId: number) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('recalculate_products_for_material', {
    p_material_id: materialId,
    p_user_id: userId,
  })

  if (error) return { error: error.message }

  revalidatePath('/productos')
  revalidatePath('/productos/[id]', 'page')

  return { success: true }
}

async function validateProveedor(proveedorId: number | null) {
  if (proveedorId === null) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('proveedores')
    .select('id')
    .eq('id', proveedorId)
    .maybeSingle()

  return data
}

export async function getMateriales() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('materiales')
    .select('*, proveedor:proveedores(id, user_id, nombre, created_at)')
    .order('nombre')
  if (error) throw new Error(error.message)
  return data
}

export async function createMaterial(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const nombre = (formData.get('nombre') as string).trim()
  const unidad = formData.get('unidad') as Unidad
  const precio = parseFloat(formData.get('precio') as string)
  const proveedorValue = (formData.get('proveedor_id') as string | null) ?? ''
  const proveedor_id = proveedorValue ? Number.parseInt(proveedorValue, 10) : null

  if (!nombre) return { error: 'El nombre es requerido.' }
  if (!unidad) return { error: 'Seleccioná una unidad de medida.' }
  if (isNaN(precio) || precio < 0) return { error: 'Precio inválido.' }
  if (proveedorValue && (proveedor_id === null || !Number.isFinite(proveedor_id) || proveedor_id <= 0)) return { error: 'Proveedor inválido.' }

  const proveedor = await validateProveedor(proveedor_id)
  if (proveedor_id !== null && !proveedor) return { error: 'Proveedor inválido.' }

  // Check duplicate
  const { data: existing } = await supabase
    .from('materiales')
    .select('id')
    .eq('user_id', user.id)
    .ilike('nombre', nombre)
    .maybeSingle()

  if (existing) return { error: 'Ya existe un material con ese nombre.' }

  const { error } = await supabase
    .from('materiales')
    .insert({ user_id: user.id, nombre, unidad, precio, proveedor_id })

  if (error) return { error: error.message }

  revalidatePath('/materiales')
  revalidatePath('/calculadora')
  return { success: true }
}

export async function updateMaterial(id: number, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const nombre = (formData.get('nombre') as string).trim()
  const unidad = formData.get('unidad') as Unidad
  const precio = parseFloat(formData.get('precio') as string)
  const proveedorValue = (formData.get('proveedor_id') as string | null) ?? ''
  const proveedor_id = proveedorValue ? Number.parseInt(proveedorValue, 10) : null

  if (!nombre) return { error: 'El nombre es requerido.' }
  if (!unidad) return { error: 'Seleccioná una unidad de medida.' }
  if (isNaN(precio) || precio < 0) return { error: 'Precio inválido.' }
  if (proveedorValue && (proveedor_id === null || !Number.isFinite(proveedor_id) || proveedor_id <= 0)) return { error: 'Proveedor inválido.' }

  const proveedor = await validateProveedor(proveedor_id)
  if (proveedor_id !== null && !proveedor) return { error: 'Proveedor inválido.' }

  const { data: dup } = await supabase
    .from('materiales')
    .select('id')
    .eq('user_id', user.id)
    .ilike('nombre', nombre)
    .neq('id', id)
    .maybeSingle()

  if (dup) return { error: 'Ya existe un material con ese nombre.' }

  const { error } = await supabase
    .from('materiales')
    .update({ nombre, unidad, precio, proveedor_id })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  const recalcResult = await recalculateProductsForMaterial(user.id, id)
  if (recalcResult?.error) return recalcResult

  revalidatePath('/materiales')
  revalidatePath('/calculadora')
  return { success: true }
}

export async function deleteMaterial(id: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('materiales')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/materiales')
  revalidatePath('/calculadora')
  return { success: true }
}
