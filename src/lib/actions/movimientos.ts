'use server'

import { refresh, revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { 
  RegistrarMovimientoInput, 
  MovimientosFiltros, 
  MovimientoStock,
  EstadisticasMovimientos 
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
// 2. OBTENER MOVIMIENTOS (con filtros opcionales)
// ========================================
export async function getMovimientos(filtros?: MovimientosFiltros) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('movimientos_stock')
    .select(`
      *,
      producto:productos(id, nombre, precio_venta, costo_total, producto_imagenes(url, orden))
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Aplicar filtros
  if (filtros?.productoId) {
    query = query.eq('producto_id', filtros.productoId)
  }
  if (filtros?.tipo) {
    query = query.eq('tipo', filtros.tipo)
  }
  if (filtros?.desde) {
    query = query.gte('created_at', filtros.desde)
  }
  if (filtros?.hasta) {
    query = query.lte('created_at', filtros.hasta)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching movimientos:', error)
    return []
  }

  return data as MovimientoStock[]
}

// ========================================
// 3. ESTADÍSTICAS
// ========================================
export async function getEstadisticas(): Promise<EstadisticasMovimientos> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return {
      totalVentas: 0,
      totalProduccion: 0,
      totalAjustes: 0,
      ventasPorMes: [],
      productosMasVendidos: [],
    }
  }

  // Obtener todos los movimientos
  const { data: movimientos } = await supabase
    .from('movimientos_stock')
    .select('*, producto:productos(nombre)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!movimientos) {
    return {
      totalVentas: 0,
      totalProduccion: 0,
      totalAjustes: 0,
      ventasPorMes: [],
      productosMasVendidos: [],
    }
  }

  // Calcular totales
  const totalVentas = movimientos
    .filter(m => m.tipo === 'venta')
    .reduce((sum, m) => sum + m.cantidad, 0)
  
  const totalProduccion = movimientos
    .filter(m => m.tipo === 'produccion')
    .reduce((sum, m) => sum + m.cantidad, 0)
  
  const totalAjustes = movimientos
    .filter(m => m.tipo === 'ajuste')
    .reduce((sum, m) => sum + m.cantidad, 0)

  // Ventas por mes
  const ventasPorMesMap = new Map<string, { cantidad: number; ingresos: number; ganancias: number }>()
  
  movimientos
    .filter(m => m.tipo === 'venta')
    .forEach(m => {
      const mes = m.created_at.substring(0, 7) // "2026-04"
      const existing = ventasPorMesMap.get(mes) || { cantidad: 0, ingresos: 0, ganancias: 0 }
      
      ventasPorMesMap.set(mes, {
        cantidad: existing.cantidad + m.cantidad,
        ingresos: existing.ingresos + (m.precio_venta || 0),
        ganancias: existing.ganancias + (m.ganancia_real || 0),
      })
    })

  const ventasPorMes = Array.from(ventasPorMesMap.entries())
    .map(([mes, datos]) => ({ mes, ...datos }))
    .sort((a, b) => b.mes.localeCompare(a.mes))

  // Productos más vendidos
  const productosMasVendidosMap = new Map<number, { nombre: string; cantidad_vendida: number; ingresos: number }>()
  
  movimientos
    .filter(m => m.tipo === 'venta' && m.producto)
    .forEach(m => {
      const existing = productosMasVendidosMap.get(m.producto_id) || {
        nombre: m.producto?.nombre || '',
        cantidad_vendida: 0,
        ingresos: 0,
      }
      
      productosMasVendidosMap.set(m.producto_id, {
        nombre: existing.nombre || m.producto?.nombre || '',
        cantidad_vendida: existing.cantidad_vendida + m.cantidad,
        ingresos: existing.ingresos + (m.precio_venta || 0),
      })
    })

  const productosMasVendidos = Array.from(productosMasVendidosMap.entries())
    .map(([producto_id, datos]) => ({ producto_id, ...datos }))
    .sort((a, b) => b.cantidad_vendida - a.cantidad_vendida)
    .slice(0, 10) // Top 10

  return {
    totalVentas,
    totalProduccion,
    totalAjustes,
    ventasPorMes,
    productosMasVendidos,
  }
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
