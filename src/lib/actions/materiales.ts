'use server'

import { revalidatePath } from 'next/cache'
import { roundSuggestedPrice } from '@/lib/product-pricing'
import { createClient } from '@/lib/supabase/server'
import type { Unidad } from '@/types'

interface ProductoMaterialForRecalc {
  id: number
  producto_id: number
  material_id: number
  cantidad: number
}

async function recalculateProductsForMaterial(userId: string, materialId: number) {
  const supabase = await createClient()

  const { data: affectedRows, error: affectedErr } = await supabase
    .from('producto_materiales')
    .select('producto_id')
    .eq('material_id', materialId)

  if (affectedErr) return { error: affectedErr.message }

  const productoIds = [...new Set((affectedRows ?? []).map(row => row.producto_id))]
  if (productoIds.length === 0) return { success: true }

  const { data: productos, error: productosErr } = await supabase
    .from('productos')
    .select('id, horas_mo, valor_hora, gastos_generales, margen')
    .in('id', productoIds)
    .eq('user_id', userId)

  if (productosErr || !productos) return { error: productosErr?.message ?? 'No se pudieron obtener los productos afectados.' }

  const { data: productoMateriales, error: productoMaterialesErr } = await supabase
    .from('producto_materiales')
    .select('id, producto_id, material_id, cantidad')
    .in('producto_id', productoIds)

  if (productoMaterialesErr || !productoMateriales) {
    return { error: productoMaterialesErr?.message ?? 'No se pudieron obtener los materiales de los productos.' }
  }

  const materialIds = [...new Set((productoMateriales as ProductoMaterialForRecalc[]).map(item => item.material_id))]
  const { data: materiales, error: materialesErr } = await supabase
    .from('materiales')
    .select('id, precio')
    .in('id', materialIds)
    .eq('user_id', userId)

  if (materialesErr || !materiales) {
    return { error: materialesErr?.message ?? 'No se pudieron obtener los precios de los materiales.' }
  }

  const materialPriceMap = new Map(materiales.map(material => [material.id, material.precio]))

  const materialesByProducto = new Map<number, ProductoMaterialForRecalc[]>()
  for (const item of productoMateriales as ProductoMaterialForRecalc[]) {
    const current = materialesByProducto.get(item.producto_id) ?? []
    current.push(item)
    materialesByProducto.set(item.producto_id, current)
  }

  const materialUpdates = productoMateriales.map(item => {
    const precio_unitario = materialPriceMap.get(item.material_id) ?? 0
    const subtotal = precio_unitario * item.cantidad

    return supabase
      .from('producto_materiales')
      .update({ precio_unitario, subtotal })
      .eq('id', item.id)
  })

  const materialResults = await Promise.all(materialUpdates)
  const materialError = materialResults.find(result => result.error)
  if (materialError?.error) return { error: materialError.error.message }

  const productUpdates = productos.map(producto => {
    const items = materialesByProducto.get(producto.id) ?? []
    const costo_materiales = items.reduce((sum, item) => sum + ((materialPriceMap.get(item.material_id) ?? 0) * item.cantidad), 0)
    const costo_mo = producto.horas_mo * producto.valor_hora
    const costo_total = costo_materiales + costo_mo + producto.gastos_generales
    const precio_venta = roundSuggestedPrice(costo_total * (1 + producto.margen / 100))

    return supabase
      .from('productos')
      .update({
        costo_materiales,
        costo_mo,
        costo_total,
        precio_venta,
      })
      .eq('id', producto.id)
      .eq('user_id', userId)
  })

  const productResults = await Promise.all(productUpdates)
  const productError = productResults.find(result => result.error)
  if (productError?.error) return { error: productError.error.message }

  revalidatePath('/productos')
  revalidatePath('/productos/[id]', 'page')

  return { success: true }
}

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
