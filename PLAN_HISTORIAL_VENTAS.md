# 📋 PLAN DE IMPLEMENTACIÓN: Historial de Ventas/Producción

## 🎯 Objetivo
Implementar un sistema completo de registro y seguimiento de movimientos de stock (ventas, producciones y ajustes) con estadísticas por fecha y análisis de ganancias reales vs proyectadas.

---

## 📊 Alcance definido

✅ **Tipos de movimientos:** Venta (resta), Producción (suma), Ajuste manual (suma/resta)  
✅ **Precio de venta:** Registrar precio real en cada transacción  
✅ **Materiales:** NO descontar automáticamente (feature futura)  
✅ **Ubicación:** Ruta principal `/movimientos` con link en navbar  
✅ **Estadísticas:** Totales, agrupados por mes, tendencias, ganancias reales  

---

## 🗄️ Fase 1: Schema de Base de Datos

### 1.1 Crear tabla `movimientos_stock`

**Archivo:** Nueva migración en Supabase

```sql
-- Tabla principal de movimientos
create table movimientos_stock (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users(id) on delete cascade not null,
  producto_id bigint references productos(id) on delete cascade not null,
  
  -- Tipo de movimiento
  tipo text not null check (tipo in ('venta', 'produccion', 'ajuste')),
  
  -- Cantidad y stock
  cantidad integer not null check (cantidad > 0),
  stock_anterior integer not null,
  stock_nuevo integer not null,
  
  -- Información de venta
  precio_venta numeric(12,2), -- precio real de venta (puede ser con descuento)
  ganancia_real numeric(12,2), -- precio_venta - costo_total (calculado)
  ganancia_proyectada numeric(12,2), -- del producto.precio_venta - producto.costo_total (para comparar)
  
  -- Metadata
  notas text,
  created_at timestamptz default now()
);

-- Índices para optimizar consultas
create index movimientos_stock_user_id_idx on movimientos_stock(user_id);
create index movimientos_stock_producto_id_idx on movimientos_stock(producto_id);
create index movimientos_stock_created_at_idx on movimientos_stock(created_at desc);
create index movimientos_stock_tipo_idx on movimientos_stock(tipo);
create index movimientos_stock_user_created_idx on movimientos_stock(user_id, created_at desc);

-- RLS (Row Level Security)
alter table movimientos_stock enable row level security;

create policy "movimientos_stock_all" on movimientos_stock
  for all using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);
```

### 1.2 Comentarios del schema

**Campos clave:**
- `tipo`: Diferencia entre venta/producción/ajuste
- `cantidad`: Siempre positivo (la dirección está en `tipo`)
- `stock_anterior/nuevo`: Snapshot del stock antes/después (auditoría)
- `precio_venta`: Precio real cobrado (permite ver descuentos)
- `ganancia_real`: Diferencia entre precio_venta y costo_total
- `ganancia_proyectada`: La ganancia que "debería" haber sido según precio_venta del producto
- `notas`: Texto libre (ej: "Venta a cliente X", "Ajuste por inventario físico")

---

## 📝 Fase 2: TypeScript Types

### 2.1 Agregar tipos en `src/types/index.ts`

```typescript
// Tipos de movimiento
export type TipoMovimiento = 'venta' | 'produccion' | 'ajuste'

// Interfaz de movimiento
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
  producto?: Producto // JOIN opcional
}

// Input para crear movimiento
export interface RegistrarMovimientoInput {
  productoId: number
  tipo: TipoMovimiento
  cantidad: number
  precioVenta?: number // requerido si tipo === 'venta'
  notas?: string
}

// Filtros para consultas
export interface MovimientosFiltros {
  productoId?: number
  tipo?: TipoMovimiento
  desde?: string // fecha ISO
  hasta?: string // fecha ISO
}

// Estadísticas
export interface EstadisticasMovimientos {
  totalVentas: number
  totalProduccion: number
  totalAjustes: number
  ventasPorMes: Array<{
    mes: string // "2026-04"
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
```

---

## ⚙️ Fase 3: Server Actions

### 3.1 Crear `src/lib/actions/movimientos.ts`

**Funciones principales:**

1. **`registrarMovimiento(input)`**
   - Validar datos de entrada
   - Obtener producto y stock actual
   - Calcular nuevo stock (venta resta, producción suma)
   - Validar stock suficiente para ventas
   - Calcular ganancia_real y ganancia_proyectada
   - Insertar registro en `movimientos_stock`
   - Actualizar `stock` en tabla `productos`
   - Revalidar cachés

2. **`getMovimientos(filtros?)`**
   - Obtener lista de movimientos con JOIN a productos
   - Aplicar filtros opcionales (producto, tipo, fechas)
   - Ordenar por fecha descendente
   - Incluir imágenes del producto

3. **`getEstadisticas()`**
   - Calcular totales por tipo de movimiento
   - Agrupar ventas por mes
   - Calcular top 10 productos más vendidos
   - Sumar ingresos y ganancias

4. **`eliminarMovimiento(id)`** (opcional)
   - Restaurar stock anterior
   - Eliminar registro
   - Usar solo para correcciones

---

## 🎨 Fase 4: Componentes UI

### 4.1 `movimiento-form.tsx` - Modal de registro

**Campos:**
- Select de producto (con imagen)
- Radio: Venta / Producción / Ajuste
- Input: Cantidad (número)
- Input: Precio venta (solo si tipo='venta')
- Textarea: Notas (opcional)

**Funcionalidad:**
- Mostrar stock actual → stock nuevo
- Validar stock suficiente para ventas
- Calcular ganancia en tiempo real
- Deshabilitar submit si hay errores

### 4.2 `movimientos-tabla.tsx` - Tabla de historial

**Columnas:**
- Fecha y hora
- Producto (imagen + nombre)
- Tipo (badge con color)
- Cantidad
- Stock: antes → después
- Precio venta (solo ventas)
- Ganancia (solo ventas)
- Notas
- Acciones (eliminar)

**Features:**
- Búsqueda por nombre
- Filtros: tipo, fechas
- Responsive (cards en mobile)

### 4.3 `estadisticas-card.tsx` - Cards de métricas

**4 Cards:**
1. Unidades vendidas
2. Unidades producidas
3. Ingresos totales
4. Ganancias totales

### 4.4 `ventas-por-mes.tsx` - Gráfico de barras

**Simple sin librerías:**
- Barras con altura proporcional
- Labels de mes en eje X
- Tooltip con: cantidad, ingresos, ganancias
- Solo HTML + CSS

### 4.5 `productos-mas-vendidos.tsx` - Top 10

**Lista con barras:**
- Nombre del producto
- Barra visual (ancho proporcional)
- Cantidad vendida
- Ingresos

### 4.6 `ultimos-movimientos.tsx` - Mini tabla

**Para página de detalle:**
- Mostrar últimos 5 movimientos del producto
- Link a historial completo

---

## 📄 Fase 5: Páginas

### 5.1 `src/app/(protected)/movimientos/page.tsx`

**Server Component:**
```typescript
export default async function MovimientosPage() {
  const [movimientos, estadisticas, productos] = await Promise.all([
    getMovimientos(),
    getEstadisticas(),
    getProductos(),
  ])

  return <MovimientosClient {...} />
}
```

### 5.2 `src/app/(protected)/movimientos/loading.tsx`

Skeleton con shimmer effect

### 5.3 `src/components/movimientos/movimientos-client.tsx`

**Layout:**
```
┌─────────────────────────────────────────┐
│  🎯 Movimientos de Stock                │
│  [+ Registrar movimiento]               │
├─────────────────────────────────────────┤
│  📊 Estadísticas                        │
│  [Card Ventas] [Card Producción] ...   │
├─────────────────────────────────────────┤
│  📈 Ventas por mes                      │
│  [Gráfico de barras]                    │
├─────────────────────────────────────────┤
│  🏆 Productos más vendidos              │
│  [Lista con barras]                     │
├─────────────────────────────────────────┤
│  📋 Historial completo                  │
│  [Búsqueda] [Filtros]                   │
│  [Tabla de movimientos]                 │
└─────────────────────────────────────────┘
```

---

## 🔗 Fase 6: Integración

### 6.1 Navbar

Agregar link: `{ href: '/movimientos', label: '📊 Movimientos' }`

### 6.2 Stock Editor

**Cambio:** Reemplazar botones +/- por:
- "Registrar venta" → abre modal con tipo='venta'
- "Registrar producción" → abre modal con tipo='produccion'

### 6.3 Detalle de producto

Agregar sección "Últimos movimientos" con componente `UltimosMovimientos`

---

## ✅ Fase 7: Testing

### Casos de prueba:

1. **Ventas:**
   - Precio > sugerido (ganancia mayor)
   - Precio < sugerido (descuento)
   - Stock insuficiente (error)

2. **Producción:**
   - Incrementa stock
   - Se refleja en estadísticas

3. **Ajustes:**
   - Positivo y negativo
   - Con notas

4. **Filtros:**
   - Por producto, tipo, fechas
   - Combinados

5. **Estadísticas:**
   - Totales correctos
   - Agrupación por mes
   - Top productos

---

## 📦 Archivos a crear/modificar

### Nuevos (11):
1. `supabase/migrations/XXXX_create_movimientos_stock.sql`
2. `src/lib/actions/movimientos.ts`
3. `src/components/movimientos/movimientos-client.tsx`
4. `src/components/movimientos/movimiento-form.tsx`
5. `src/components/movimientos/movimientos-tabla.tsx`
6. `src/components/movimientos/estadisticas-card.tsx`
7. `src/components/movimientos/ventas-por-mes.tsx`
8. `src/components/movimientos/productos-mas-vendidos.tsx`
9. `src/components/movimientos/ultimos-movimientos.tsx`
10. `src/app/(protected)/movimientos/page.tsx`
11. `src/app/(protected)/movimientos/loading.tsx`

### Modificar (4):
1. `src/types/index.ts`
2. `src/components/layout/navbar.tsx`
3. `src/components/productos/stock-editor.tsx`
4. `src/app/(protected)/productos/[id]/page.tsx`

---

## ⏱️ Estimación

- Fase 1 (Schema): 30 min
- Fase 2 (Types): 15 min
- Fase 3 (Actions): 1.5 hrs
- Fase 4 (UI): 3 hrs
- Fase 5 (Páginas): 1 hr
- Fase 6 (Integración): 1 hr
- Fase 7 (Testing): 1 hr

**Total: ~8 horas**

---

## 🚀 Orden de implementación

1. Schema + migración
2. Types
3. Server actions básicos
4. Página `/movimientos` con tabla simple
5. Modal de registro
6. Estadísticas y gráficos
7. Integración con stock editor
8. Últimos movimientos en detalle
9. Testing y refinamiento

---

## 📌 Notas importantes

- La tabla usa `ON DELETE CASCADE` para productos
- Stock siempre se valida antes de ventas
- Ganancias calculadas automáticamente
- Permite comparar ganancia real vs proyectada
- Descuento de materiales queda para feature futura
- RLS protege datos por usuario
