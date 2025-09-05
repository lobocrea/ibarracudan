
-- Habilitar la extensión pgcrypto para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "public";

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Allow public read access on productos" ON "public"."productos";
DROP POLICY IF EXISTS "Allow authenticated users to manage their orders" ON "public"."pedidos";
DROP POLICY IF EXISTS "Allow authenticated users to manage their order items" ON "public"."items_pedido";
DROP POLICY IF EXISTS "Allow authenticated users to read their own data" ON "public"."pedidos";

-- Eliminar tablas si existen, en el orden correcto para evitar errores de dependencia
DROP TABLE IF EXISTS "public"."items_pedido" CASCADE;
DROP TABLE IF EXISTS "public"."pedidos" CASCADE;
DROP TABLE IF EXISTS "public"."productos" CASCADE;
DROP TABLE IF EXISTS "public"."notas_entrega" CASCADE;

-- Crear la tabla de productos
CREATE TABLE IF NOT EXISTS "public"."productos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "tipo" "text",
    "quantity" integer DEFAULT 0 NOT NULL,
    "buy_price" numeric DEFAULT 0 NOT NULL,
    "sell_price" numeric DEFAULT 0 NOT NULL,
    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "public"."productos" ENABLE ROW LEVEL SECURITY;

-- Crear la tabla de pedidos
CREATE TABLE IF NOT EXISTS "public"."pedidos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "total" numeric,
    "client_name" "text",
    "client_address" "text",
    "client_phone" "text",
    "client_id_number" "text",
    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pedidos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);
ALTER TABLE "public"."pedidos" ENABLE ROW LEVEL SECURITY;

-- Crear la tabla de items_pedido
CREATE TABLE IF NOT EXISTS "public"."items_pedido" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pedido_id" "uuid" NOT NULL,
    "producto_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "sell_price" numeric NOT NULL,
    CONSTRAINT "items_pedido_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "items_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE CASCADE,
    CONSTRAINT "items_pedido_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE RESTRICT
);
ALTER TABLE "public"."items_pedido" ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad
CREATE POLICY "Allow public read access on productos" ON "public"."productos" FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to manage their orders" ON "public"."pedidos" FOR ALL USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Allow authenticated users to manage their order items" ON "public"."items_pedido" FOR ALL USING ((auth.uid() IN ( SELECT pedidos.user_id FROM pedidos WHERE (pedidos.id = items_pedido.pedido_id))));
CREATE POLICY "Allow authenticated users to read their own data" ON "public"."pedidos" FOR SELECT USING (("auth"."uid"() = "user_id"));

-- Eliminar la función si existe para evitar conflictos
DROP FUNCTION IF EXISTS handle_new_order(text,text,text,text,jsonb);

-- Crear o reemplazar la función para manejar nuevos pedidos
CREATE OR REPLACE FUNCTION handle_new_order(
    p_client_name text,
    p_client_address text,
    p_client_phone text,
    p_client_id_number text,
    p_order_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pedido_id uuid;
    v_total_price numeric := 0;
    item record;
    product_price numeric;
BEGIN
    -- Insertar el nuevo pedido y obtener su ID
    INSERT INTO public.pedidos (user_id, client_name, client_address, client_phone, client_id_number)
    VALUES (auth.uid(), p_client_name, p_client_address, p_client_phone, p_client_id_number)
    RETURNING id INTO v_pedido_id;

    -- Iterar sobre cada item en el JSON
    FOR item IN SELECT * FROM jsonb_to_recordset(p_order_items) AS x(producto_id uuid, quantity int)
    LOOP
        -- Obtener el precio de venta del producto
        SELECT sell_price INTO product_price
        FROM public.productos
        WHERE id = item.producto_id;

        -- Insertar el item del pedido con su precio de venta
        INSERT INTO public.items_pedido (pedido_id, producto_id, quantity, sell_price)
        VALUES (v_pedido_id, item.producto_id, item.quantity, product_price);

        -- Actualizar el stock del producto
        UPDATE public.productos
        SET quantity = quantity - item.quantity
        WHERE id = item.producto_id;

        -- Acumular el precio total del pedido
        v_total_price := v_total_price + (item.quantity * product_price);
    END LOOP;

    -- Actualizar el precio total en la tabla de pedidos
    UPDATE public.pedidos
    SET total = v_total_price
    WHERE id = v_pedido_id;
END;
$$;
