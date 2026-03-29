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

export interface Material {
  id: number
  user_id: string
  nombre: string
  unidad: Unidad
  precio: number
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
}

export interface CalcItem {
  materialId: number | ''
  cantidad: number
}
