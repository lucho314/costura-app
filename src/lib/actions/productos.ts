'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { deleteProductImage } from '@/lib/r2/server'
import type { CalcItem, Producto, ProductoImagen } from '@/types'

export interface SaveProductoInput {
  nombre: string
  items: CalcItem[]
  horas_mo: number
  valor_hora: number
  gastos_generales: number
  margen: number
}

function sortImages(images?: ProductoImagen[] | null) {
  return [...(images ?? [])].sort((a, b) => a.orden - b.orden)
}

function normalizeProducto<T extends Producto | null>(producto: T): T {
  if (!producto) return producto

  return {
    ...producto,
    producto_imagenes: sortImages(producto.producto_imagenes),
  }
}

export async function saveProducto(input: SaveProductoInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { nombre, items, horas_mo, valor_hora, gastos_generales, margen } = input

  if (!nombre.trim()) return { error: 'El nombre del producto es requerido.' }

  // Fetch material prices
  const materialIds = items
    .filter(i => i.materialId !== '')
    .map(i => i.materialId as number)

  if (materialIds.length === 0) return { error: 'Agregá al menos un material.' }

  const { data: materialesDB, error: mErr } = await supabase
    .from('materiales')
    .select('id, precio, unidad')
    .in('id', materialIds)
    .eq('user_id', user.id)

  if (mErr || !materialesDB) return { error: 'Error obteniendo materiales.' }

  const priceMap = new Map(materialesDB.map(m => [m.id, m.precio]))

  const costo_materiales = items.reduce((sum, item) => {
    if (item.materialId === '') return sum
    const precio = priceMap.get(item.materialId as number) ?? 0
    return sum + precio * item.cantidad
  }, 0)

  const costo_mo = horas_mo * valor_hora
  const costo_total = costo_materiales + costo_mo + gastos_generales
  const precio_venta = costo_total * (1 + margen / 100)

  const { data: producto, error: pErr } = await supabase
    .from('productos')
    .insert({
      user_id: user.id,
      nombre: nombre.trim(),
      costo_materiales,
      horas_mo,
      valor_hora,
      costo_mo,
      gastos_generales,
      costo_total,
      margen,
      precio_venta,
      stock: 1,
    })
    .select('id')
    .single()

  if (pErr || !producto) return { error: pErr?.message ?? 'Error guardando producto.' }

  // Insert product materials
  const pm = items
    .filter(i => i.materialId !== '' && i.cantidad > 0)
    .map(i => ({
      producto_id: producto.id,
      material_id: i.materialId as number,
      cantidad: i.cantidad,
      precio_unitario: priceMap.get(i.materialId as number) ?? 0,
      subtotal: (priceMap.get(i.materialId as number) ?? 0) * i.cantidad,
    }))

  const { error: pmErr } = await supabase.from('producto_materiales').insert(pm)
  if (pmErr) return { error: pmErr.message }

  revalidatePath('/productos')
  return { success: true, id: producto.id }
}

export async function getProductos(search?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('productos')
    .select(`
      *,
      producto_imagenes (
        id,
        producto_id,
        user_id,
        object_key,
        url,
        orden,
        alt,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('nombre', `%${search}%`)
  }

  const { data } = await query
  return (data ?? []).map(producto => normalizeProducto(producto as Producto))
}

export async function getProductoDetalle(id: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('productos')
    .select(`
      *,
      producto_imagenes (
        id,
        producto_id,
        user_id,
        object_key,
        url,
        orden,
        alt,
        created_at
      ),
      producto_materiales (
        *,
        material:materiales ( nombre, unidad )
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  return normalizeProducto(data as Producto | null)
}

export async function updateStock(id: number, stock: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('productos')
    .update({ stock })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/productos')
  revalidatePath(`/productos/${id}`)
  return { success: true }
}

export async function deleteProducto(id: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: imagenes } = await supabase
    .from('producto_imagenes')
    .select('object_key')
    .eq('producto_id', id)
    .eq('user_id', user.id)

  await Promise.all((imagenes ?? []).map(async imagen => {
    try {
      await deleteProductImage(imagen.object_key)
    } catch {
      // Si el archivo ya no existe en R2, igual dejamos avanzar el borrado del producto.
    }
  }))

  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/productos')
  return { success: true }
}
