'use server'

import { refresh, revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type {
  RegistrarMovimientoInput,
  MovimientosFiltros,
  MovimientoStock,
  EstadisticasMovimientos,
  TipoMovimiento,
} from '@/types'

// ========================================
// 1. REGISTRAR MOVIMIENTO
// ========================================
export async function registrarMovimiento(input: RegistrarMovimientoInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { productoId, tipo, cantidad, precioVenta, notas } = input

  // Validaciones
  if (cantidad <= 0) return { error: 'La cantidad debe ser mayor a 0' }
  if (tipo === 'venta' && !precioVenta) {
    return { error: 'Debes ingresar el precio de venta' }
  }

  // 1. Obtener producto actual
  const { data: producto, error: productoErr } = await supabase
    .from('productos')
    .select('id, nombre, stock, costo_total, precio_venta')
    .eq('id', productoId)
    .eq('user_id', user.id)
    .single()

  if (productoErr || !producto) {
    return { error: 'No se encontró el producto' }
  }

  // 2. Calcular nuevo stock
  const stockAnterior = producto.stock
  let cambio = cantidad
  
  if (tipo === 'venta') {
    cambio = -cantidad // Ventas restan
  } else if (tipo === 'produccion') {
    cambio = cantidad // Producción suma
  }
  // Para ajustes, la cantidad ya viene con el signo correcto desde el UI
  
  const stockNuevo = stockAnterior + cambio

  if (stockNuevo < 0) {
    return { error: `Stock insuficiente. Disponible: ${stockAnterior}` }
  }

  // 3. Calcular ganancias (solo para ventas)
  let gananciaReal = null
  let gananciaProyectada = null
  
  if (tipo === 'venta' && precioVenta) {
    gananciaReal = precioVenta - producto.costo_total
    gananciaProyectada = producto.precio_venta - producto.costo_total
  }

  // 4. Registrar movimiento
  const { error: insertErr } = await supabase
    .from('movimientos_stock')
    .insert({
      user_id: user.id,
      producto_id: productoId,
      tipo,
      cantidad: Math.abs(cantidad),
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      precio_venta: precioVenta || null,
      ganancia_real: gananciaReal,
      ganancia_proyectada: gananciaProyectada,
      notas: notas || null,
    })

  if (insertErr) return { error: insertErr.message }

  // 5. Actualizar stock del producto
  const { error: updateErr } = await supabase
    .from('productos')
    .update({ stock: stockNuevo })
    .eq('id', productoId)
    .eq('user_id', user.id)

  if (updateErr) return { error: updateErr.message }

  // 6. Revalidar cachés
  revalidatePath('/productos')
  revalidatePath(`/productos/${productoId}`)
  revalidatePath('/movimientos')
  refresh()
  
  return { success: true, stockNuevo }
}

// ========================================
// 2. OBTENER MOVIMIENTOS (paginado)
// ========================================
export async function getMovimientosPage(
  offset: number,
  limit: number,
  tipo?: TipoMovimiento | ''
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { movimientos: [] as MovimientoStock[], total: 0 }

  let query = supabase
    .from('movimientos_stock')
    .select(`
      *,
      producto:productos(id, nombre, precio_venta, costo_total, producto_imagenes(url, orden))
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tipo) {
    query = query.eq('tipo', tipo)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching movimientos:', error)
    return { movimientos: [] as MovimientoStock[], total: 0 }
  }

  return { movimientos: data as MovimientoStock[], total: count ?? 0 }
}

// ========================================
// 3. ESTADÍSTICAS
// ========================================
export async function getEstadisticas(): Promise<EstadisticasMovimientos> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const empty: EstadisticasMovimientos = {
    totalVentas: 0,
    totalProduccion: 0,
    totalAjustes: 0,
    totalIngresos: 0,
    totalGanancias: 0,
    ventasPorMes: [],
    productosMasVendidos: [],
  }

  if (!user) return empty

  const { data, error } = await supabase.rpc('get_estadisticas', { p_user_id: user.id })
  if (error || !data) return empty

  return data as EstadisticasMovimientos
}

// ========================================
// 4. ELIMINAR MOVIMIENTO (opcional - solo para correcciones)
// ========================================
export async function eliminarMovimiento(id: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener movimiento
  const { data: movimiento, error: fetchErr } = await supabase
    .from('movimientos_stock')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !movimiento) {
    return { error: 'No se encontró el movimiento' }
  }

  // Restaurar stock
  const { error: updateErr } = await supabase
    .from('productos')
    .update({ stock: movimiento.stock_anterior })
    .eq('id', movimiento.producto_id)
    .eq('user_id', user.id)

  if (updateErr) return { error: updateErr.message }

  // Eliminar movimiento
  const { error: deleteErr } = await supabase
    .from('movimientos_stock')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteErr) return { error: deleteErr.message }

  revalidatePath('/movimientos')
  revalidatePath('/productos')
  refresh()
  
  return { success: true }
}
