# Gestion de Materiales

App web mobile-first para gestionar materiales, calcular costos de produccion y administrar el stock de productos.

## Funcionalidades

- **Materiales**: ABM de insumos con nombre, unidad y precio unitario
- **Calculadora**: calcula el costo de un producto sumando materiales, mano de obra, gastos generales y margen de ganancia
- **Productos / Stock**: listado de productos creados con precio de venta y control de stock

## Stack

- [Next.js](https://nextjs.org/): framework React con App Router
- [Supabase](https://supabase.com/): base de datos PostgreSQL + Auth (Google OAuth)
- [Cloudflare R2](https://developers.cloudflare.com/r2/): storage de imagenes de productos
- [Tailwind CSS](https://tailwindcss.com/): estilos utility-first

## Base de datos

| Tabla | Descripcion |
|---|---|
| `materiales` | Insumos del usuario |
| `productos` | Productos con costos calculados |
| `producto_materiales` | Composicion de materiales por producto |

Todas las tablas tienen **Row Level Security (RLS)** activo: cada usuario solo ve sus propios datos.

## Desarrollo local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
# Copiar .env.example a .env.local y completar los valores

# 3. Correr en desarrollo
npm run dev
```

Abri [http://localhost:3000](http://localhost:3000) en el navegador.

## Configurar Cloudflare R2

Para guardar fotos de productos en R2:

1. Entra a Cloudflare Dashboard -> `R2` -> `Create bucket`.
2. Crea un bucket, por ejemplo `gestion-materiales`.
3. En `Manage R2 API Tokens`, genera un token con permisos de lectura y escritura sobre ese bucket.
4. Copia `.env.example` a `.env.local` y completa:

```bash
R2_ACCOUNT_ID=tu_account_id
R2_ACCESS_KEY_ID=tu_access_key_id
R2_SECRET_ACCESS_KEY=tu_secret_access_key
R2_BUCKET=gestion-materiales
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
```

5. En el bucket, habilita un dominio publico (`r2.dev`) o conecta un dominio propio para mostrar las imagenes.
6. Configura CORS del bucket para permitir subidas desde tu app. Un ejemplo minimo:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://tu-dominio.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

Notas:

- Las credenciales de R2 deben quedar solo del lado servidor. No uses `NEXT_PUBLIC_` para esas variables.
- El free tier de R2 aplica a `Standard storage`, no a `Infrequent Access`.
- Mas adelante vamos a usar estas credenciales para generar subidas seguras y guardar solo la URL y metadatos en Supabase.
