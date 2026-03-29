# Gestión de Materiales

App web mobile-first para gestionar materiales, calcular costos de producción y administrar el stock de productos.

## Funcionalidades

- **Materiales** — ABM de insumos con nombre, unidad y precio unitario
- **Calculadora** — Calculá el costo de un producto sumando materiales, mano de obra, gastos generales y margen de ganancia
- **Productos / Stock** — Listado de productos creados con precio de venta y control de stock

## Stack

- [Next.js](https://nextjs.org/) — Framework React con App Router
- [Supabase](https://supabase.com/) — Base de datos PostgreSQL + Auth (Google OAuth)
- [Tailwind CSS](https://tailwindcss.com/) — Estilos utility-first

## Base de datos

| Tabla | Descripción |
|---|---|
| `materiales` | Insumos del usuario |
| `productos` | Productos con costos calculados |
| `producto_materiales` | Composición de materiales por producto |

Todas las tablas tienen **Row Level Security (RLS)** activo — cada usuario solo ve sus propios datos.

## Desarrollo local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
# Crear .env.local con:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 3. Correr en desarrollo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.
