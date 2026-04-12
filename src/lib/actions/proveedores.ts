'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Proveedor } from '@/types'

export async function getProveedores() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .order('nombre')

  if (error) throw new Error(error.message)
  return data
}

export async function getProveedoresPage(offset: number, limit: number, search?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('proveedores')
    .select('*', { count: 'exact' })
    .order('nombre')
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.ilike('nombre', `%${search}%`)
  }

  const { data, count, error } = await query
  if (error) throw new Error(error.message)

  return { proveedores: (data ?? []) as Proveedor[], total: count ?? 0 }
}

export async function createProveedor(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const nombre = (formData.get('nombre') as string).trim()
  const direccion = normalizeOptionalText(formData.get('direccion'))
  const telefono = normalizeOptionalText(formData.get('telefono'))
  const pagina = normalizeOptionalText(formData.get('pagina'))
  if (!nombre) return { error: 'El nombre es requerido.' }

  const { data: existing } = await supabase
    .from('proveedores')
    .select('id')
    .ilike('nombre', nombre)
    .maybeSingle()

  if (existing) return { error: 'Ya existe un proveedor con ese nombre.' }

  const { error } = await supabase
    .from('proveedores')
    .insert({ nombre, direccion, telefono, pagina })

  if (error) return { error: error.message }

  revalidatePath('/proveedores')
  revalidatePath('/materiales')
  return { success: true }
}

export async function updateProveedor(id: number, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const nombre = (formData.get('nombre') as string).trim()
  const direccion = normalizeOptionalText(formData.get('direccion'))
  const telefono = normalizeOptionalText(formData.get('telefono'))
  const pagina = normalizeOptionalText(formData.get('pagina'))
  if (!nombre) return { error: 'El nombre es requerido.' }

  const { data: dup } = await supabase
    .from('proveedores')
    .select('id')
    .ilike('nombre', nombre)
    .neq('id', id)
    .maybeSingle()

  if (dup) return { error: 'Ya existe un proveedor con ese nombre.' }

  const { error } = await supabase
    .from('proveedores')
    .update({ nombre, direccion, telefono, pagina })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/proveedores')
  revalidatePath('/materiales')
  return { success: true }
}

export async function deleteProveedor(id: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('proveedores')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/proveedores')
  revalidatePath('/materiales')
  return { success: true }
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}
