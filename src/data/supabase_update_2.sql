-- supabase_update_2.sql

-- Eliminar la columna user_id de la tabla de productos si existe
DO $$
BEGIN
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='user_id') THEN
      ALTER TABLE public.productos DROP COLUMN user_id;
   END IF;
END $$;

-- Añadir la columna user_id a la tabla de pedidos si no existe
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='user_id') THEN
      ALTER TABLE public.pedidos ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
   END IF;
END $$;


-- Actualizar la función para que utilice el user_id del solicitante
CREATE OR REPLACE FUNCTION public.handle_new_order(
    client_name_input TEXT,
    items_input JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_order_id BIGINT;
    order_total NUMERIC := 0;
    item RECORD;
    product_record RECORD;
    response JSONB;
    requesting_user_id UUID := auth.uid(); -- Obtener el ID del usuario que llama
BEGIN
    -- Calcular el total y comprobar el stock
    FOR item IN SELECT * FROM jsonb_to_recordset(items_input) AS x(producto_id BIGINT, quantity INT)
    LOOP
        SELECT * INTO product_record FROM public.productos WHERE id = item.producto_id FOR UPDATE;

        IF product_record IS NULL THEN
            response := jsonb_build_object('error', 'Producto con ID ' || item.producto_id || ' no encontrado.');
            RETURN response;
        END IF;

        IF product_record.quantity < item.quantity THEN
            response := jsonb_build_object('error', 'Stock insuficiente para ' || product_record.code || '. Disponible: ' || product_record.quantity);
            RETURN response;
        END IF;

        order_total := order_total + (product_record.sell_price * item.quantity);
    END LOOP;

    -- Crear el pedido
    INSERT INTO public.pedidos (client_name, total, user_id)
    VALUES (client_name_input, order_total, requesting_user_id)
    RETURNING id INTO new_order_id;

    -- Insertar los items del pedido y actualizar el stock
    FOR item IN SELECT * FROM jsonb_to_recordset(items_input) AS x(producto_id BIGINT, quantity INT)
    LOOP
        SELECT * INTO product_record FROM public.productos WHERE id = item.producto_id;
    
        INSERT INTO public.items_pedido (pedido_id, producto_id, quantity, sell_price)
        VALUES (new_order_id, item.producto_id, item.quantity, product_record.sell_price);

        UPDATE public.productos
        SET quantity = quantity - item.quantity
        WHERE id = item.producto_id;
    END LOOP;
    
    response := jsonb_build_object('success', true, 'pedido_id', new_order_id);
    RETURN response;
END;
$$;
