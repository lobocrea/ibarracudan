-- Utiliza este script para configurar tu base de datos Supabase.
-- Asegúrate de ejecutarlo en el Editor de SQL de tu proyecto.

-- 1. Elimina políticas y tablas existentes para una configuración limpia (IDEMPOTENCIA)
DROP POLICY IF EXISTS "Allow public read access on productos" ON public.productos;
DROP POLICY IF EXISTS "Allow authenticated users to manage their inventory" ON public.productos;
DROP POLICY IF EXISTS "Allow authenticated users to manage their orders" ON public.pedidos;
DROP POLICY IF EXISTS "Allow authenticated users to read order items" ON public.items_pedido;

DROP TABLE IF EXISTS public.notas_entrega;
DROP TABLE IF EXISTS public.items_pedido;
DROP TABLE IF EXISTS public.pedidos;
DROP TABLE IF EXISTS public.productos;

-- 2. Crea las tablas

-- Tabla de Productos
CREATE TABLE public.productos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code text NOT NULL,
    tipo text NULL,
    quantity integer NOT NULL DEFAULT 0,
    buy_price numeric NOT NULL DEFAULT 0,
    sell_price numeric NOT NULL DEFAULT 0,
    user_id uuid NULL DEFAULT auth.uid(),
    CONSTRAINT productos_pkey PRIMARY KEY (id),
    CONSTRAINT productos_code_key UNIQUE (code)
);

-- Tabla de Pedidos
CREATE TABLE public.pedidos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    client_name text NULL,
    total numeric NULL,
    user_id uuid NULL DEFAULT auth.uid(),
    client_address text NULL,
    client_phone text NULL,
    client_id_number text NULL,
    CONSTRAINT pedidos_pkey PRIMARY KEY (id)
);

-- Tabla de Items de Pedido (tabla de unión)
CREATE TABLE public.items_pedido (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    pedido_id uuid NOT NULL,
    producto_id uuid NOT NULL,
    quantity integer NOT NULL,
    sell_price numeric NOT NULL,
    CONSTRAINT items_pedido_pkey PRIMARY KEY (id),
    CONSTRAINT items_pedido_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE,
    CONSTRAINT items_pedido_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE RESTRICT
);

-- Tabla de Notas de Entrega
CREATE TABLE public.notas_entrega (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    pedido_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    pdf_url text NULL,
    CONSTRAINT notas_entrega_pkey PRIMARY KEY (id),
    CONSTRAINT notas_entrega_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE
);

-- 3. Habilita RLS (Row Level Security)
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_entrega ENABLE ROW LEVEL SECURITY;

-- 4. Crea las políticas de seguridad
CREATE POLICY "Allow public read access on productos" ON public.productos FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to manage their inventory" ON public.productos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow authenticated users to manage their orders" ON public.pedidos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow authenticated users to read order items" ON public.items_pedido FOR SELECT USING (EXISTS (
    SELECT 1 FROM pedidos p WHERE p.id = items_pedido.pedido_id AND p.user_id = auth.uid()
));

-- 5. Crea la función para manejar nuevos pedidos
DROP FUNCTION IF EXISTS public.handle_new_order(text,text,text,text,jsonb);

CREATE OR REPLACE FUNCTION public.handle_new_order(p_client_name text, p_client_address text, p_client_phone text, p_client_id_number text, p_order_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_pedido_id uuid;
    v_total_pedido numeric := 0;
    item record;
    v_sell_price numeric;
    v_stock integer;
BEGIN
    -- Insert into pedidos table and get the new id
    INSERT INTO public.pedidos (client_name, client_address, client_phone, client_id_number, user_id)
    VALUES (p_client_name, p_client_address, p_client_phone, p_client_id_number, auth.uid())
    RETURNING id INTO v_pedido_id;

    -- Loop through order items
    FOR item IN SELECT * FROM jsonb_to_recordset(p_order_items) AS x(producto_id uuid, quantity integer)
    LOOP
        -- Get product sell_price and current stock
        SELECT sell_price, quantity INTO v_sell_price, v_stock FROM public.productos WHERE id = item.producto_id;

        -- Check if enough stock is available
        IF v_stock < item.quantity THEN
            RAISE EXCEPTION 'No hay suficiente stock para el producto ID %', item.producto_id;
        END IF;

        -- Insert into items_pedido
        INSERT INTO public.items_pedido(pedido_id, producto_id, quantity, sell_price)
        VALUES (v_pedido_id, item.producto_id, item.quantity, v_sell_price);
        
        -- Update total
        v_total_pedido := v_total_pedido + (v_sell_price * item.quantity);

        -- Decrement product stock
        UPDATE public.productos
        SET quantity = quantity - item.quantity
        WHERE id = item.producto_id;
    END LOOP;

    -- Update total in the pedidos table
    UPDATE public.pedidos
    SET total = v_total_pedido
    WHERE id = v_pedido_id;
END;
$function$;
