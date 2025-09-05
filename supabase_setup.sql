-- Configuración inicial completa para la base de datos de Supabase
-- Versión corregida para ser idempotente y evitar errores de existencia.

-- 1. Eliminar políticas existentes en el orden correcto
-- Políticas para la tabla de items_pedido
DROP POLICY IF EXISTS "Enable read access for users who own the order" ON "items_pedido";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "items_pedido";

-- Políticas para la tabla de pedidos
DROP POLICY IF EXISTS "Enable read access for own orders" ON "pedidos";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "pedidos";

-- Políticas para la tabla de productos
DROP POLICY IF EXISTS "Enable read access for all users" ON "productos";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "productos";
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "productos";
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON "productos";

-- 2. Eliminar funciones existentes
DROP FUNCTION IF EXISTS public.handle_new_order(text, jsonb);

-- 3. Eliminar tablas existentes en orden de dependencia inversa
-- La tabla `notas_entrega` depende de `pedidos`
DROP TABLE IF EXISTS "notas_entrega" CASCADE;
-- La tabla `items_pedido` depende de `pedidos` y `productos`
DROP TABLE IF EXISTS "items_pedido" CASCADE;
-- La tabla `pedidos` depende de `auth.users`
DROP TABLE IF EXISTS "pedidos" CASCADE;
-- La tabla `productos` no tiene dependencias salientes
DROP TABLE IF EXISTS "productos" CASCADE;


-- 4. Crear la tabla de Productos
CREATE TABLE "productos" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "code" text NOT NULL UNIQUE,
    "tipo" text,
    "quantity" integer NOT NULL DEFAULT 0,
    "buy_price" numeric NOT NULL DEFAULT 0,
    "sell_price" numeric NOT NULL DEFAULT 0
);
COMMENT ON TABLE "productos" IS 'Almacena los productos del inventario.';

-- Habilitar RLS y crear políticas para la tabla de productos
ALTER TABLE "productos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON "productos" FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for authenticated users" ON "productos" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON "productos" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users" ON "productos" FOR DELETE TO authenticated USING (true);


-- 5. Crear la tabla de Pedidos
CREATE TABLE "pedidos" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "client_name" text,
    "total" numeric,
    "user_id" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);
COMMENT ON TABLE "pedidos" IS 'Almacena la cabecera de los pedidos de clientes.';

-- Habilitar RLS y crear políticas para la tabla de pedidos
ALTER TABLE "pedidos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for own orders" ON "pedidos" FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for authenticated users" ON "pedidos" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);


-- 6. Crear la tabla de Items del Pedido (tabla intermedia)
CREATE TABLE "items_pedido" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "pedido_id" uuid NOT NULL REFERENCES "pedidos"(id) ON DELETE CASCADE,
    "producto_id" uuid NOT NULL REFERENCES "productos"(id) ON DELETE RESTRICT,
    "quantity" integer NOT NULL CHECK (quantity > 0),
    "sell_price" numeric NOT NULL
);
COMMENT ON TABLE "items_pedido" IS 'Almacena los detalles o líneas de cada pedido.';

-- Habilitar RLS y crear políticas para la tabla de items_pedido
ALTER TABLE "items_pedido" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for users who own the order" ON "items_pedido" FOR SELECT TO authenticated USING ((SELECT user_id FROM pedidos WHERE id = pedido_id) = auth.uid());
CREATE POLICY "Enable insert for authenticated users" ON "items_pedido" FOR INSERT TO authenticated WITH CHECK ((SELECT user_id FROM pedidos WHERE id = pedido_id) = auth.uid());


-- 7. Crear la función para manejar nuevos pedidos
CREATE OR REPLACE FUNCTION public.handle_new_order(
  client_name text,
  order_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_order_id uuid;
  order_total numeric := 0;
  item record;
  product_stock int;
  product_sell_price numeric;
BEGIN
  -- Iterar sobre los items para calcular el total y validar stock
  FOR item IN SELECT * FROM jsonb_to_recordset(order_items) AS x(producto_id uuid, quantity int)
  LOOP
    -- Obtener precio de venta y stock actual del producto
    SELECT p.sell_price, p.quantity INTO product_sell_price, product_stock
    FROM public.productos p WHERE p.id = item.producto_id;

    -- Validar si el producto existe
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto con ID % no encontrado.', item.producto_id;
    END IF;

    -- Validar stock
    IF product_stock < item.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para el producto %. Disponible: %, Solicitado: %', (SELECT code FROM productos WHERE id = item.producto_id), product_stock, item.quantity;
    END IF;
    
    -- Acumular el total del pedido
    order_total := order_total + (item.quantity * product_sell_price);
  END LOOP;

  -- Crear el nuevo pedido en la tabla "pedidos"
  INSERT INTO public.pedidos (client_name, total, user_id)
  VALUES (client_name, order_total, auth.uid())
  RETURNING id INTO new_order_id;

  -- Insertar los items del pedido en "items_pedido" y actualizar el stock
  FOR item IN SELECT * FROM jsonb_to_recordset(order_items) AS x(producto_id uuid, quantity int)
  LOOP
    -- Obtener el precio de venta (de nuevo para asegurar consistencia en el bucle)
    SELECT p.sell_price INTO product_sell_price
    FROM public.productos p WHERE p.id = item.producto_id;

    -- Insertar el item en la tabla "items_pedido"
    INSERT INTO public.items_pedido (pedido_id, producto_id, quantity, sell_price)
    VALUES (new_order_id, item.producto_id, item.quantity, product_sell_price);

    -- Actualizar el inventario de la tabla "productos"
    UPDATE public.productos
    SET quantity = quantity - item.quantity
    WHERE id = item.producto_id;
  END LOOP;

  -- Devolver el ID del nuevo pedido creado
  RETURN new_order_id;
END;
$$;


-- 8. Insertar los datos iniciales de los productos
-- Se usa ON CONFLICT para evitar errores si los códigos de producto ya existen.
INSERT INTO "productos" ("code", "tipo", "quantity", "buy_price", "sell_price") VALUES
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