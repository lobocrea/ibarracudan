-- 1. Crear tabla para Productos
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  tipo text,
  quantity integer not null check (quantity >= 0),
  buy_price numeric not null check (buy_price >= 0),
  sell_price numeric not null check (sell_price >= 0),
  created_at timestamptz default now()
);

-- 2. Crear tabla para Pedidos
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null default auth.uid(),
  client_name text not null,
  total numeric not null check (total >= 0),
  created_at timestamptz default now()
);

-- 3. Crear tabla para Items del Pedido (tabla pivote)
create table if not exists items_pedido (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references pedidos(id) on delete cascade,
  product_id uuid references productos(id),
  quantity integer not null check (quantity > 0),
  sell_price numeric not null
);

-- 4. Crear tabla para Notas de Entrega
create table if not exists notas_entrega (
    id uuid primary key default gen_random_uuid(),
    order_id uuid references pedidos(id) on delete cascade,
    content text,
    created_at timestamptz default now()
);

-- 5. Crear el tipo para los items del pedido que se pasarán a la función
drop type if exists pedido_item;
create type pedido_item as (
  product_id uuid,
  quantity integer,
  sell_price numeric
);

-- 6. Crear función para crear un pedido y actualizar el stock
create or replace function crear_pedido_y_actualizar_stock(
  p_client_name text,
  p_items pedido_item[]
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_order_id uuid;
  v_total_price numeric := 0;
  item pedido_item;
  v_product record;
begin
  -- Calcular el precio total y verificar stock
  foreach item in array p_items
  loop
    select * into v_product from productos where id = item.product_id;
    
    if v_product is null then
      raise exception 'Producto con ID % no encontrado', item.product_id;
    end if;

    if v_product.quantity < item.quantity then
      raise exception 'Stock insuficiente para el producto % (%). Disponible: %', v_product.code, item.product_id, v_product.quantity;
    end if;
    
    v_total_price := v_total_price + (item.quantity * item.sell_price);
  end loop;

  -- Insertar el nuevo pedido
  insert into pedidos (client_name, total, user_id)
  values (p_client_name, v_total_price, auth.uid())
  returning id into v_order_id;

  -- Insertar los items del pedido y actualizar stock
  foreach item in array p_items
  loop
    insert into items_pedido (order_id, product_id, quantity, sell_price)
    values (v_order_id, item.product_id, item.quantity, item.sell_price);

    update productos
    set quantity = quantity - item.quantity
    where id = item.product_id;
  end loop;

  -- Crear la nota de entrega
  insert into notas_entrega(order_id, content)
  values (v_order_id, 'Nota de entrega para el pedido de ' || p_client_name);

  return v_order_id;
end;
$$;


-- 7. Configurar RLS (Row Level Security)

-- Habilitar RLS en todas las tablas
alter table productos enable row level security;
alter table pedidos enable row level security;
alter table items_pedido enable row level security;
alter table notas_entrega enable row level security;

-- Limpiar políticas antiguas
drop policy if exists "Allow public read access" on productos;
drop policy if exists "Allow authenticated users to manage products" on productos;
drop policy if exists "Allow users to see their own orders" on pedidos;
drop policy if exists "Allow users to create their own orders" on pedidos;
drop policy if exists "Allow users to see items of their own orders" on items_pedido;
drop policy if exists "Allow users to see notes for their own orders" on notas_entrega;

-- Políticas para 'productos'
create policy "Allow public read access" on productos
  for select using (true);
create policy "Allow authenticated users to manage products" on productos
  for all using (auth.role() = 'authenticated');

-- Políticas para 'pedidos'
create policy "Allow users to see their own orders" on pedidos
  for select using (auth.uid() = user_id);
create policy "Allow users to create their own orders" on pedidos
  for insert with check (auth.uid() = user_id);

-- Políticas para 'items_pedido'
create policy "Allow users to see items of their own orders" on items_pedido
  for select using (
    exists (
      select 1 from pedidos
      where pedidos.id = items_pedido.order_id and pedidos.user_id = auth.uid()
    )
  );
  
-- Políticas para 'notas_entrega'
create policy "Allow users to see notes for their own orders" on notas_entrega
  for select using (
    exists (
      select 1 from pedidos
      where pedidos.id = notas_entrega.order_id and pedidos.user_id = auth.uid()
    )
  );

-- 8. Insertar datos de productos si la tabla está vacía
-- Esta es una forma de asegurar que los datos iniciales se inserten solo una vez.
do $$
begin
  if not exists (select 1 from productos) then
    insert into productos (code, tipo, quantity, buy_price, sell_price) values
    ('CT-500 1H', 'LCL240-13 ( 500 mcm )', 100, 10, 20),
    ('CT-2 1H', 'LCL35-12 (2 AWG)', 100, 10, 20),
    ('CT-2/0 1H', 'LCL70-12 (2/0 AWG)', 100, 10, 20),
    ('CT-4/0 1H', 'LCL120-13 (4/0 AWG)', 100, 10, 20),
    ('CT-4 1H', 'LCL25-6 (4 AWG)', 100, 10, 20),
    ('CT-8 1H', 'LCL10-6 (8 AWG)', 100, 10, 20),
    ('CT-250 1H', 'LCL120-13 ( 250 mcm)', 100, 10, 20),
    ('CT-6 1H', 'LCL16-6 (6 AWG)', 100, 10, 20),
    ('CT-1/0 1H', 'LCL50-12 (1/0 AWG)', 100, 10, 20),
    ('CT-350 1H', 'LCL185-13 ( 350 mcm)', 100, 10, 20),
    ('CT-4/0 2H', 'TTL120-13 (4/0 AWG)', 100, 10, 20),
    ('PTNB 10-12', '(AWG 8)', 100, 10, 20),
    ('CT-500 2H', 'TTL240-13 ( 500 mcm)', 100, 10, 20),
    ('PTNB 16-13', '(AWG 6)', 100, 10, 20),
    ('CT-350 2H', 'TTL185-13 ( 350 mcm)', 100, 10, 20),
    ('2-T', 'GTY35', 100, 10, 20),
    ('CT-2/0 2H', 'TTL70-12 (2/0 AWG)', 100, 10, 20),
    ('CT-250 2H', 'TTL120-13 ( 250 mcm)', 100, 10, 20),
    ('CT-3/0 1H', 'LCL95-12 (3/0 AWG)', 100, 10, 20),
    ('500-T', 'GTY240', 100, 10, 20),
    ('CT-750 2H', 'TTL400-13 ( 750 mcm)', 100, 10, 20),
    ('CT-1000 2H', 'TTL500-13 ( 1000 mcm)', 100, 10, 20),
    ('6-T', 'GTY16', 100, 10, 20),
    ('4-T', 'GTY25', 100, 10, 20),
    ('CT-1/0 2H', 'TTL50-12 (1/0 AWG)', 100, 10, 20),
    ('2/0-T', 'GTY70', 100, 10, 20),
    ('1/0-T', 'GTY50', 100, 10, 20),
    ('CT-2 2H', 'TTL35-12 (2 AWG)', 100, 10, 20),
    ('250-T', 'GTY150', 100, 10, 20),
    ('YQK-300', 'PRENSA YQK-300', 100, 10, 20),
    ('350-T', 'GTY185', 100, 10, 20),
    ('4/0-T', 'GTY120', 100, 10, 20),
    ('8-T', 'GTY10', 100, 10, 20),
    ('HX-50B', 'PRENSA HX-50B', 100, 10, 20),
    ('HS-D1', 'PELA CABLE HS-D1', 100, 10, 20),
    ('CT-750 1H', 'LCL400-13 ( 750 mcm)', 100, 10, 20),
    ('J52', 'CORTA CABLE - J52', 100, 10, 20),
    ('EB-630', 'Electric Hydraulic Crimping tool', 100, 10, 20),
    ('CT-1000 1H', 'LCL500-13 ( 1000 mcm)', 100, 10, 20),
    ('3/0-T', 'GTY95', 100, 10, 20),
    ('SYK-15', 'PONCHADORA SYK-15', 100, 10, 20),
    ('CTC-350', 'YAL185 (350MCM)', 100, 10, 20),
    ('CTC-500', 'YAL240 (500MCM)', 100, 10, 20),
    ('PTNB 25-15', '(AWG 4)', 100, 10, 20),
    ('PTNB 35-20', '(AWG 2)', 100, 10, 20),
    ('CT-3/0 2H', 'TTL95-12 (3/0 AWG)', 100, 10, 20);
  end if;
end $$;