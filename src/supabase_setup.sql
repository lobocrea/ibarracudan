-- 1. Crear tabla para Productos
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text,
  quantity integer not null default 0,
  buy_price numeric not null default 0,
  sell_price numeric not null default 0,
  created_at timestamptz default now()
);

-- 2. Crear tabla para Pedidos
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  total numeric not null,
  created_at timestamptz default now()
);

-- 3. Crear tabla para Items de Pedido (tabla pivote)
create table if not exists items_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade,
  producto_id uuid references productos(id),
  quantity integer not null,
  sell_price numeric not null
);

-- 4. Crear tabla para Notas de Entrega
create table if not exists notas_entrega (
    id uuid primary key default gen_random_uuid(),
    pedido_id uuid references pedidos(id) on delete cascade unique,
    content text,
    created_at timestamptz default now()
);

-- 5. Habilitar RLS para todas las tablas
alter table productos enable row level security;
alter table pedidos enable row level security;
alter table items_pedido enable row level security;
alter table notas_entrega enable row level security;

-- 6. Crear políticas de acceso para RLS
-- Permitir acceso público de lectura a todos
create policy "Allow public read access on productos" on productos for select using (true);
create policy "Allow public read access on pedidos" on pedidos for select using (true);
create policy "Allow public read access on items_pedido" on items_pedido for select using (true);
create policy "Allow public read access on notas_entrega" on notas_entrega for select using (true);

-- Permitir a usuarios autenticados insertar, actualizar y eliminar
create policy "Allow authed users to insert" on productos for insert to authenticated with check (true);
create policy "Allow authed users to update" on productos for update to authenticated using (true);
create policy "Allow authed users to delete" on productos for delete to authenticated using (true);

create policy "Allow authed users to insert" on pedidos for insert to authenticated with check (true);
create policy "Allow authed users to update" on pedidos for update to authenticated using (true);
create policy "Allow authed users to delete" on pedidos for delete to authenticated using (true);

create policy "Allow authed users to insert" on items_pedido for insert to authenticated with check (true);
create policy "Allow authed users to update" on items_pedido for update to authenticated using (true);
create policy "Allow authed users to delete" on items_pedido for delete to authenticated using (true);

create policy "Allow authed users to insert" on notas_entrega for insert to authenticated with check (true);

-- 7. Crear función para manejar la creación de pedidos y el descuento de stock
create or replace function public.crear_pedido_completo(
    client_name text,
    order_items json
)
returns uuid as $$
declare
    new_pedido_id uuid;
    item record;
    producto_stock int;
    new_total numeric := 0;
    nota_content text := '';
begin
    -- Validar que haya items
    if json_array_length(order_items) = 0 then
        raise exception 'El pedido debe tener al menos un producto';
    end if;

    -- Calcular el total y preparar la nota
    for item in select * from json_to_recordset(order_items) as x(product_id uuid, quantity int, sell_price numeric)
    loop
        -- Verificar stock
        select quantity into producto_stock from productos where id = item.product_id;
        if producto_stock < item.quantity then
            raise exception 'Stock insuficiente para el producto ID %', item.product_id;
        end if;
        
        new_total := new_total + (item.quantity * item.sell_price);

        -- Agregar a la nota de entrega
        nota_content := nota_content || format('Producto: %s, Cantidad: %s, Precio Unitario: %s', (select code from productos where id = item.product_id), item.quantity, item.sell_price) || E'\n';
    end loop;

    -- Insertar el pedido
    insert into pedidos (client_name, total)
    values (crear_pedido_completo.client_name, new_total)
    returning id into new_pedido_id;

    -- Insertar items del pedido y actualizar stock
    for item in select * from json_to_recordset(order_items) as x(product_id uuid, quantity int, sell_price numeric)
    loop
        insert into items_pedido (pedido_id, producto_id, quantity, sell_price)
        values (new_pedido_id, item.product_id, item.quantity, item.sell_price);

        update productos
        set quantity = quantity - item.quantity
        where id = item.product_id;
    end loop;
    
    -- Crear la nota de entrega
    nota_content := 'Nota de Entrega para: ' || crear_pedido_completo.client_name || E'\n' || 'Pedido ID: ' || new_pedido_id::text || E'\n\n' || nota_content || E'\nTotal: ' || new_total;
    insert into notas_entrega (pedido_id, content)
    values (new_pedido_id, nota_content);
    
    return new_pedido_id;
end;
$$ language plpgsql volatile security definer;

-- Dar permisos a los usuarios autenticados para ejecutar la función
grant execute on function public.crear_pedido_completo(text, json) to authenticated;

-- 8. Insertar los datos de los productos
INSERT INTO productos (code, type, quantity, buy_price, sell_price) VALUES
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
('CT-3/0 2H', 'TTL95-12 (3/0 AWG)', 100, 10, 20)
ON CONFLICT (code) DO NOTHING;
