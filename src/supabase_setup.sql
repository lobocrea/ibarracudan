-- Utiliza CREATE OR REPLACE para actualizar la función sin eliminarla
CREATE OR REPLACE FUNCTION public.handle_new_order(
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
    v_item record;
    v_product record;
BEGIN
    -- Insertar el pedido y obtener el ID
    INSERT INTO public.pedidos (client_name, client_address, client_phone, client_id_number, user_id)
    VALUES (p_client_name, p_client_address, p_client_phone, p_client_id_number, auth.uid())
    RETURNING id INTO v_pedido_id;

    -- Iterar sobre los productos del pedido
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_order_items) AS x(producto_id uuid, quantity int)
    LOOP
        -- Obtener el producto y bloquear la fila para evitar condiciones de carrera
        SELECT * INTO v_product FROM public.productos WHERE id = v_item.producto_id FOR UPDATE;

        -- Verificar si hay suficiente stock
        IF v_product.quantity < v_item.quantity THEN
            RAISE EXCEPTION 'No hay suficiente stock para el producto % (ID: %)', v_product.code, v_product.id;
        END IF;

        -- Actualizar el stock del producto
        UPDATE public.productos
        SET quantity = quantity - v_item.quantity
        WHERE id = v_item.producto_id;

        -- Insertar el item del pedido
        INSERT INTO public.items_pedido (pedido_id, producto_id, quantity, sell_price)
        VALUES (v_pedido_id, v_item.producto_id, v_item.quantity, v_product.sell_price);

        -- Calcular el subtotal y sumarlo al total
        v_total_price := v_total_price + (v_product.sell_price * v_item.quantity);
    END LOOP;

    -- Actualizar el total en la tabla de pedidos
    UPDATE public.pedidos
    SET total = v_total_price
    WHERE id = v_pedido_id;

END;
$$;

-- Asegurarse de que el rol `postgres` (el superusuario) es el dueño de la función.
-- Esto es importante para que `SECURITY DEFINER` funcione correctamente.
ALTER FUNCTION public.handle_new_order(text, text, text, text, jsonb) OWNER TO postgres;

-- Otorgar permisos al rol `authenticated` para que los usuarios autenticados puedan llamar a esta función.
GRANT EXECUTE ON FUNCTION public.handle_new_order(text, text, text, text, jsonb) TO authenticated;

-- (Opcional) Refrescar el schema cache para roles no superusuarios
NOTIFY pgrst, 'reload schema';
