'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Unidad } from '@/types'

export async function getMateriales() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('materiales')
    .select('*')
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

  if (!nombre) return { error: 'El nombre es requerido.' }
  if (!unidad) return { error: 'Seleccioná una unidad de medida.' }
  if (isNaN(precio) || precio < 0) return { error: 'Precio inválido.' }

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
    .insert({ user_id: user.id, nombre, unidad, precio })

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

  if (!nombre) return { error: 'El nombre es requerido.' }
  if (!unidad) return { error: 'Seleccioná una unidad de medida.' }
  if (isNaN(precio) || precio < 0) return { error: 'Precio inválido.' }

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
    .update({ nombre, unidad, precio })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

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
