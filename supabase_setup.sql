-- Primero, se eliminan las tablas en el orden correcto para evitar problemas de dependencias.
-- La cláusula CASCADE se encarga de eliminar objetos dependientes (como políticas o claves foráneas).
DROP TABLE IF EXISTS public.notas_entrega CASCADE;
DROP TABLE IF EXISTS public.items_pedido CASCADE;
DROP TABLE IF EXISTS public.pedidos CASCADE;
DROP TABLE IF EXISTS public.productos CASCADE;


-- Se recrea la tabla de productos.
CREATE TABLE public.productos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    code text NOT NULL UNIQUE,
    tipo text,
    quantity integer DEFAULT 0 NOT NULL,
    buy_price numeric(10,2) DEFAULT 0.00 NOT NULL,
    sell_price numeric(10,2) DEFAULT 0.00 NOT NULL,
    CONSTRAINT productos_quantity_check CHECK ((quantity >= 0))
);

-- Se recrea la tabla de pedidos con las nuevas columnas de cliente.
CREATE TABLE public.pedidos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    client_name text,
    total numeric(10,2),
    user_id uuid,
    client_address text, -- Nueva columna
    client_phone text, -- Nueva columna
    client_id_number text -- Nueva columna
);

-- Se recrea la tabla de items de pedido.
CREATE TABLE public.items_pedido (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    producto_id uuid NOT NULL REFERENCES public.productos(id),
    quantity integer NOT NULL,
    sell_price numeric(10,2) NOT NULL
);

-- Se recrea la tabla (opcional) de notas de entrega.
CREATE TABLE public.notas_entrega (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    pdf_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- Se eliminan las políticas de seguridad si existen, antes de volver a crearlas.
-- Esto hace que el script sea idempotente (se puede ejecutar varias veces sin error).
DROP POLICY IF EXISTS "Allow public read access on productos" ON public.productos;
DROP POLICY IF EXISTS "Allow authenticated users to manage their products" ON public.productos;
DROP POLICY IF EXISTS "Allow public read access on pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Allow authenticated users to manage their orders" ON public.pedidos;
DROP POLICY IF EXISTS "Allow public read access on items_pedido" ON public.items_pedido;
DROP POLICY IF EXISTS "Allow authenticated users to manage order items" ON public.items_pedido;


-- Se recrean las políticas de seguridad.
CREATE POLICY "Allow public read access on productos" ON public.productos FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to manage their products" ON public.productos FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow public read access on pedidos" ON public.pedidos FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to manage their orders" ON public.pedidos FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Allow public read access on items_pedido" ON public.items_pedido FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to manage order items" ON public.items_pedido FOR ALL USING (
    (SELECT user_id FROM public.pedidos WHERE id = pedido_id) = auth.uid()
);


-- Se habilita el Row Level Security (RLS) para cada tabla.
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_entrega ENABLE ROW LEVEL SECURITY;


-- Primero, se elimina la función existente para evitar el error de cambio de tipo de retorno.
DROP FUNCTION IF EXISTS public.handle_new_order(text, text, text, text, jsonb);

-- Se crea o reemplaza la función para manejar la creación de un nuevo pedido.
CREATE OR REPLACE FUNCTION public.handle_new_order(
    p_client_name text,
    p_client_address text,
    p_client_phone text,
    p_client_id_number text,
    p_order_items jsonb
)
RETURNS void -- Cambiado a void ya que no necesitamos que devuelva el ID.
LANGUAGE plpgsql
SECURITY DEFINER -- La función se ejecuta con los permisos del usuario que la creó.
AS $$
DECLARE
    v_pedido_id uuid;
    v_total_pedido numeric(10, 2) := 0;
    item record;
    v_sell_price numeric(10, 2);
    v_stock integer;
BEGIN
    -- 1. Crear el nuevo pedido en la tabla 'pedidos'
    INSERT INTO public.pedidos (user_id, client_name, client_address, client_phone, client_id_number)
    VALUES (auth.uid(), p_client_name, p_client_address, p_client_phone, p_client_id_number)
    RETURNING id INTO v_pedido_id;

    -- 2. Recorrer cada item del pedido
    FOR item IN SELECT * FROM jsonb_to_recordset(p_order_items) AS x(producto_id uuid, quantity integer)
    LOOP
        -- Obtener el precio de venta actual y el stock del producto
        SELECT sell_price, quantity INTO v_sell_price, v_stock
        FROM public.productos
        WHERE id = item.producto_id;

        -- Verificar si hay stock suficiente
        IF v_stock < item.quantity THEN
            RAISE EXCEPTION 'No hay stock suficiente para el producto ID %', item.producto_id;
        END IF;

        -- Insertar el item en 'items_pedido'
        INSERT INTO public.items_pedido (pedido_id, producto_id, quantity, sell_price)
        VALUES (v_pedido_id, item.producto_id, item.quantity, v_sell_price);

        -- Actualizar el stock del producto
        UPDATE public.productos
        SET quantity = quantity - item.quantity
        WHERE id = item.producto_id;

        -- Calcular el subtotal del item y sumarlo al total del pedido
        v_total_pedido := v_total_pedido + (v_sell_price * item.quantity);
    END LOOP;

    -- 3. Actualizar el total en la tabla 'pedidos'
    UPDATE public.pedidos
    SET total = v_total_pedido
    WHERE id = v_pedido_id;

END;
$$;
