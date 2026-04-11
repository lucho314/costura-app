-- ============================================================
--  GESTIÓN DE MATERIALES — Supabase Schema
-- ============================================================

-- 1. MATERIALES
create table proveedores (
  id          bigint primary key generated always as identity,
  user_id     uuid references auth.users(id) on delete cascade,
  nombre      text not null,
  direccion   text,
  telefono    text,
  telefono_internacional text,
  pagina      text,
  google_maps_url text,
  google_place_id text,
  business_status text,
  rating      numeric(2,1),
  user_ratings_total integer,
  source_query text,
  place_types text[],
  lat         double precision,
  lng         double precision,
  opening_hours jsonb,
  created_at  timestamptz default now()
);

create table materiales (
  id          bigint primary key generated always as identity,
  user_id     uuid references auth.users(id) on delete cascade not null,
  proveedor_id bigint references proveedores(id) on delete set null,
  nombre      text not null,
  unidad      text not null,
  precio      numeric(12,2) not null default 0,
  created_at  timestamptz default now()
);

-- 2. PRODUCTOS
create table productos (
  id                bigint primary key generated always as identity,
  user_id           uuid references auth.users(id) on delete cascade not null,
  nombre            text not null,
  costo_materiales  numeric(12,2) not null default 0,
  horas_mo          numeric(8,2) default 0,
  valor_hora        numeric(12,2) default 0,
  costo_mo          numeric(12,2) default 0,
  gastos_generales  numeric(12,2) default 0,
  costo_total       numeric(12,2) not null default 0,
  margen            numeric(5,2) default 0,
  precio_venta      numeric(12,2) not null default 0,
  stock             integer default 1,
  created_at        timestamptz default now()
);

-- 3. COMPOSICIÓN DE PRODUCTOS
create table producto_materiales (
  id              bigint primary key generated always as identity,
  producto_id     bigint references productos(id) on delete cascade not null,
  material_id     bigint references materiales(id) on delete restrict not null,
  cantidad        numeric(12,4) not null default 0,
  precio_unitario numeric(12,2) not null default 0,
  subtotal        numeric(12,2) not null default 0
);

-- 4. IMAGENES DE PRODUCTOS
create table producto_imagenes (
  id          bigint primary key generated always as identity,
  producto_id bigint references productos(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  object_key  text not null,
  url         text not null,
  orden       integer not null default 0,
  alt         text,
  created_at  timestamptz default now()
);

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================

alter table proveedores enable row level security;
alter table materiales enable row level security;
alter table productos enable row level security;
alter table producto_materiales enable row level security;
alter table producto_imagenes enable row level security;

create policy "proveedores_all_authenticated" on proveedores
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Materiales: solo el dueño
create policy "materiales_all" on materiales
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Productos: solo el dueño
create policy "productos_all" on productos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Producto_materiales: a través del producto dueño
create policy "producto_materiales_all" on producto_materiales
  for all using (
    producto_id in (select id from productos where user_id = auth.uid())
  )
  with check (
    producto_id in (select id from productos where user_id = auth.uid())
  );

-- Producto_imagenes: solo el duenio del producto
create policy "producto_imagenes_all" on producto_imagenes
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
--  ÍNDICES
-- ============================================================

create index proveedores_user_id_idx on proveedores(user_id);
create unique index proveedores_google_place_id_key on proveedores(google_place_id) where google_place_id is not null;
create index materiales_user_id_idx on materiales(user_id);
create index materiales_proveedor_id_idx on materiales(proveedor_id);
create index productos_user_id_idx on productos(user_id);
create index producto_materiales_producto_id_idx on producto_materiales(producto_id);
create index producto_imagenes_producto_id_idx on producto_imagenes(producto_id, orden);
create index producto_imagenes_user_id_idx on producto_imagenes(user_id);
