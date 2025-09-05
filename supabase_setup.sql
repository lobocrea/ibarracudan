-- supabase_setup.sql

-- 1. Alterar la tabla de pedidos para añadir nuevas columnas de cliente
-- Esto añade las columnas solo si no existen, evitando errores si el script se ejecuta de nuevo.
ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS client_address TEXT,
ADD COLUMN IF NOT EXISTS client_phone TEXT,
ADD COLUMN IF NOT EXISTS client_id_number TEXT;


-- 2. Actualizar la función para manejar la inserción de nuevos pedidos
-- CREATE OR REPLACE FUNCTION actualizará la función existente sin necesidad de borrarla primero.
CREATE OR REPLACE FUNCTION public.handle_new_order(
    p_client_name TEXT,
    p_client_address TEXT,
    p_client_phone TEXT,
    p_client_id_number TEXT,
    p_order_items JSONB
)
RETURNS UUID AS $$
DECLARE
    v_pedido_id UUID;
    v_user_id UUID;
    v_total_price NUMERIC := 0;
    item RECORD;
    v_sell_price NUMERIC;
    v_quantity_in_stock INT;
BEGIN
    -- Obtener el ID del usuario autenticado
    SELECT auth.uid() INTO v_user_id;

    -- Calcular el precio total y verificar el stock
    FOR item IN SELECT * FROM jsonb_to_recordset(p_order_items) AS x(producto_id UUID, quantity INT)
    LOOP
        -- Obtener el precio de venta y el stock actual del producto
        SELECT
            p.sell_price,
            p.quantity
        INTO
            v_sell_price,
            v_quantity_in_stock
        FROM public.productos AS p
        WHERE p.id = item.producto_id;

        -- Si el producto no existe o no tiene precio, lanzar un error
        IF v_sell_price IS NULL THEN
            RAISE EXCEPTION 'Producto con ID % no encontrado o sin precio de venta.', item.producto_id;
        END IF;

        -- Si no hay suficiente stock, lanzar un error
        IF v_quantity_in_stock < item.quantity THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto con ID %.', item.producto_id;
        END IF;

        -- Acumular el precio total
        v_total_price := v_total_price + (v_sell_price * item.quantity);
    END LOOP;

    -- Insertar en la tabla de pedidos
    INSERT INTO public.pedidos (user_id, client_name, client_address, client_phone, client_id_number, total)
    VALUES (v_user_id, p_client_name, p_client_address, p_client_phone, p_client_id_number, v_total_price)
    RETURNING id INTO v_pedido_id;

    -- Insertar los items del pedido y actualizar el stock
    FOR item IN SELECT * FROM jsonb_to_recordset(p_order_items) AS x(producto_id UUID, quantity INT)
    LOOP
        -- Obtener el precio de venta actual del producto
        SELECT sell_price INTO v_sell_price FROM public.productos WHERE id = item.producto_id;

        -- Insertar el item del pedido
        INSERT INTO public.items_pedido (pedido_id, producto_id, quantity, sell_price)
        VALUES (v_pedido_id, item.producto_id, item.quantity, v_sell_price);

        -- Actualizar el stock del producto
        UPDATE public.productos
        SET quantity = quantity - item.quantity
        WHERE id = item.producto_id;
    END LOOP;

    RETURN v_pedido_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


GRANT EXECUTE ON FUNCTION public.handle_new_order(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
