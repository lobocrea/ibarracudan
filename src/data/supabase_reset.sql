-- Asegúrate de que el usuario tiene los permisos necesarios para ejecutar estas acciones.

-- Eliminar la tabla items_pedido si existe, junto con sus dependencias.
DROP TABLE IF EXISTS items_pedido CASCADE;

-- Eliminar la tabla pedidos si existe, junto con sus dependencias.
DROP TABLE IF EXISTS pedidos CASCADE;

-- Volver a crear la tabla pedidos con la estructura correcta.
CREATE TABLE pedidos (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    client_name TEXT NOT NULL,
    total NUMERIC NOT NULL,
    delivery_note TEXT,
    user_id UUID REFERENCES auth.users(id),
    items JSONB NOT NULL -- Columna para almacenar los productos y cantidades.
);

-- Volver a crear la tabla items_pedido (aunque ahora los datos principales estarán en la columna 'items' de 'pedidos',
-- podríamos mantenerla por si se necesita para análisis más complejos en el futuro, o eliminarla si no se usa).
-- Por simplicidad y siguiendo tu petición, la mantendremos para futuras referencias.
CREATE TABLE items_pedido (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    pedido_id BIGINT REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id TEXT REFERENCES productos(id),
    quantity INTEGER NOT NULL,
    sell_price NUMERIC NOT NULL
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_pedido ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad para las nuevas tablas
CREATE POLICY "Allow all for authenticated users on pedidos" ON pedidos FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users on items_pedido" ON items_pedido FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to see their own orders" ON pedidos FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Actualizar la función para manejar nuevos pedidos y usar la columna 'items'
CREATE OR REPLACE FUNCTION handle_new_order(client_name_input TEXT, items_input JSONB)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item JSONB;
    product RECORD;
    new_order_id BIGINT;
    total_price NUMERIC := 0;
    delivery_note_text TEXT := '';
BEGIN
    -- Generar cabecera de la nota de entrega
    delivery_note_text := '--- NOTA DE ENTREGA ---\n\n';
    delivery_note_text := delivery_note_text || 'Cliente: ' || client_name_input || '\n';
    delivery_note_text := delivery_note_text || 'Fecha: ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI') || '\n\n';
    delivery_note_text := delivery_note_text || '--- Productos ---\n';

    -- Calcular precio total, verificar stock y construir nota de entrega
    FOR item IN SELECT * FROM jsonb_array_elements(items_input)
    LOOP
        SELECT * INTO product FROM productos WHERE id = (item->>'productId')::TEXT;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto con ID % no encontrado', item->>'productId';
        END IF;

        IF product.quantity < (item->>'quantity')::INT THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto % (%). Disponible: %', product.code, item->>'quantity', product.quantity;
        END IF;

        total_price := total_price + ((item->>'sellPrice')::NUMERIC * (item->>'quantity')::INT);
        delivery_note_text := delivery_note_text || ' - Código: ' || product.code || ', Cantidad: ' || item->>'quantity' || '\n';
    END LOOP;

    -- Añadir el total a la nota de entrega
    delivery_note_text := delivery_note_text || '\nTotal del Pedido: ' || total_price::TEXT || ' €\n';

    -- Insertar el nuevo pedido con los datos y la nota de entrega
    INSERT INTO pedidos (client_name, total, delivery_note, user_id, items)
    VALUES (client_name_input, total_price, delivery_note_text, auth.uid(), items_input)
    RETURNING id INTO new_order_id;

    -- Actualizar el inventario
    FOR item IN SELECT * FROM jsonb_array_elements(items_input)
    LOOP
        UPDATE productos
        SET quantity = quantity - (item->>'quantity')::INT
        WHERE id = (item->>'productId')::TEXT;

        -- Insertar en items_pedido para mantener la relación (opcional, pero bueno para análisis)
        INSERT INTO items_pedido(pedido_id, producto_id, quantity, sell_price)
        VALUES (new_order_id, (item->>'productId')::TEXT, (item->>'quantity')::INT, (item->>'sellPrice')::NUMERIC);
    END LOOP;

    RETURN new_order_id;
END;
$$;
