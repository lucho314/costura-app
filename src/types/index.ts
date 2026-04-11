export type Unidad =
  | 'Metro'
  | 'Cm'
  | 'Kg'
  | 'Gr'
  | 'Unidad'
  | 'Bobina'
  | 'Rollo'
  | 'Par'
  | 'Paquete'
  | 'Litro'
  | 'ml'

export const UNIDADES: Unidad[] = [
  'Metro', 'Cm', 'Kg', 'Gr', 'Unidad',
  'Bobina', 'Rollo', 'Par', 'Paquete', 'Litro', 'ml',
]

export interface Proveedor {
  id: number
  user_id: string | null
  nombre: string
  direccion: string | null
  telefono: string | null
  telefono_internacional: string | null
  pagina: string | null
  google_maps_url: string | null
  google_place_id: string | null
  business_status: string | null
  rating: number | null
  user_ratings_total: number | null
  source_query: string | null
  place_types: string[] | null
  lat: number | null
  lng: number | null
  opening_hours: string[] | null
  created_at: string
}

export interface Material {
  id: number
  user_id: string
  nombre: string
  unidad: Unidad
  precio: number
  proveedor_id: number | null
  proveedor?: Proveedor | null
  created_at: string
}

export interface ProductoMaterial {
  id: number
  producto_id: number
  material_id: number
  cantidad: number
  precio_unitario: number
  subtotal: number
  material?: Material
}

export interface ProductoImagen {
  id: number
  producto_id: number
  user_id: string
  object_key: string
  url: string
  orden: number
  alt: string | null
  created_at: string
}

export interface Producto {
  id: number
  user_id: string
  nombre: string
  costo_materiales: number
  horas_mo: number
  valor_hora: number
  costo_mo: number
  gastos_generales: number
  costo_total: number
  margen: number
  precio_venta: number
  stock: number
  created_at: string
  producto_materiales?: ProductoMaterial[]
  producto_imagenes?: ProductoImagen[]
}

export interface CalcItem {
  materialId: number | ''
  cantidad: number
}

// ========================================
// MOVIMIENTOS DE STOCK
// ========================================

export type TipoMovimiento = 'venta' | 'produccion' | 'ajuste'

export interface MovimientoStock {
  id: number
  user_id: string
  producto_id: number
  tipo: TipoMovimiento
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  precio_venta: number | null
  ganancia_real: number | null
  ganancia_proyectada: number | null
  notas: string | null
  created_at: string
  producto?: Producto
}

export interface RegistrarMovimientoInput {
  productoId: number
  tipo: TipoMovimiento
  cantidad: number
  precioVenta?: number
  notas?: string
}

export interface MovimientosFiltros {
  productoId?: number
  tipo?: TipoMovimiento
  desde?: string
  hasta?: string
}

export interface EstadisticasMovimientos {
  totalVentas: number
  totalProduccion: number
  totalAjustes: number
  ventasPorMes: Array<{
    mes: string
    cantidad: number
    ingresos: number
    ganancias: number
  }>
  productosMasVendidos: Array<{
    producto_id: number
    nombre: string
    cantidad_vendida: number
    ingresos: number
  }>
}
