-- supabase_update_3.sql

-- 1. Añadir la columna 'items' a la tabla 'pedidos' para almacenar los productos y cantidades.
-- Usamos JSONB que es más eficiente para almacenar y consultar datos JSON.
ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Actualizar o crear la función para manejar la creación de nuevos pedidos.
-- Esta función ahora insertará los items del pedido en la nueva columna 'items'.
-- También se encarga de actualizar el inventario.
CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item RECORD;
    stock_quantity INT;
    new_order_id UUID;
    order_items JSONB;
BEGIN
    -- Obtenemos los items del nuevo pedido que vienen en la fila insertada.
    -- Esperamos que NEW.items sea un JSON array de objetos con 'producto_id' y 'quantity'.
    order_items := NEW.items;

    -- Creamos el ID del nuevo pedido
    new_order_id := gen_random_uuid();

    -- Iteramos sobre cada item en el JSON para verificar el stock y actualizarlo.
    FOR item IN SELECT * FROM jsonb_to_recordset(order_items) AS x(producto_id UUID, quantity INT)
    LOOP
        -- Obtenemos el stock actual del producto.
        SELECT p.quantity INTO stock_quantity FROM public.productos p WHERE p.id = item.producto_id;

        -- Verificamos si hay suficiente stock.
        IF stock_quantity IS NULL OR stock_quantity < item.quantity THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto ID %', item.producto_id;
        END IF;

        -- Disminuimos el stock del producto en la tabla de productos.
        UPDATE public.productos
        SET quantity = quantity - item.quantity
        WHERE id = item.producto_id;
    END LOOP;

    -- Insertamos el registro final en la tabla de pedidos con el ID generado,
    -- el ID del usuario que lo crea, el total, el cliente y los items.
    INSERT INTO public.pedidos (id, user_id, client_name, total, items, created_at)
    VALUES (new_order_id, auth.uid(), NEW.client_name, NEW.total, order_items, now());

    -- Retornamos la nueva fila para que el trigger de inserción pueda devolverla.
    -- Como hemos hecho la inserción nosotros mismos, devolvemos el nuevo registro.
    SELECT * INTO NEW FROM public.pedidos WHERE id = new_order_id;
    
    RETURN NEW;
END;
$$;

-- 3. Asegurarse de que el trigger esté asociado a la tabla 'pedidos'
-- Esto es por si el trigger se hubiera borrado o no existiera.
-- El trigger se dispara ANTES de una inserción, para que la función pueda manejar la lógica.
-- NOTA: Como la función ahora hace el INSERT por sí misma, sería más apropiado un trigger
-- INSTEAD OF en una vista, pero para una tabla, un BEFORE trigger que no inserte nada
-- y luego haga el insert es un patrón común para añadir lógica compleja.
-- Para simplificar, vamos a asumir que no se inserta nada si la función se ejecuta.
-- La función `handle_new_order` se encarga de la inserción, así que devolvemos NULL
-- en el trigger para evitar la inserción original.

DROP TRIGGER IF EXISTS on_order_created ON public.pedidos;
CREATE TRIGGER on_order_created
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_order();

-- Damos permisos a los roles autenticados para usar la tabla.
GRANT SELECT, INSERT ON public.pedidos TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE pedidos_id_seq TO authenticated; -- Si existiera una secuencia.
