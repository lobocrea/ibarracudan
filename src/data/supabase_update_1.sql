-- Agregar la columna user_id a la tabla de pedidos
ALTER TABLE public.pedidos
ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Asegurarse de que las filas existentes tengan un propietario (opcional, puedes asignar un usuario por defecto si es necesario)
-- Por ejemplo, para asignar los pedidos existentes a un usuario específico (reemplaza 'TU_USER_ID' con un ID real)
-- UPDATE public.pedidos SET user_id = 'TU_USER_ID' WHERE user_id IS NULL;


-- Actualizar la función para manejar la creación de nuevos pedidos incluyendo el user_id
CREATE OR REPLACE FUNCTION public.handle_new_order (
  client_name_input TEXT,
  items_input JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_order_id BIGINT;
  new_order_total NUMERIC(10, 2) := 0;
  item_record RECORD;
  product_record RECORD;
  new_delivery_note_id BIGINT;
  current_user_id UUID := auth.uid();
BEGIN
  -- 1. Calcular el total del pedido y verificar el stock
  FOR item_record IN SELECT * FROM jsonb_to_recordset(items_input) AS x(product_id BIGINT, quantity INT)
  LOOP
    SELECT * INTO product_record FROM public.productos WHERE id = item_record.product_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Producto con ID ' || item_record.product_id || ' no encontrado.');
    END IF;

    IF product_record.quantity < item_record.quantity THEN
      RETURN jsonb_build_object('error', 'Stock insuficiente para el producto ' || product_record.code || '. Disponible: ' || product_record.quantity);
    END IF;

    new_order_total := new_order_total + (product_record.sell_price * item_record.quantity);
  END LOOP;

  -- 2. Crear el nuevo pedido y obtener su ID, asignando el usuario actual
  INSERT INTO public.pedidos (client_name, total, user_id)
  VALUES (client_name_input, new_order_total, current_user_id)
  RETURNING id INTO new_order_id;

  -- 3. Insertar los ítems del pedido y actualizar el stock de productos
  FOR item_record IN SELECT * FROM jsonb_to_recordset(items_input) AS x(product_id BIGINT, quantity INT, sell_price NUMERIC(10,2))
  LOOP
    -- Insertar el ítem en la tabla de ítems de pedido
    INSERT INTO public.items_pedido (order_id, product_id, quantity, sell_price)
    VALUES (new_order_id, item_record.product_id, item_record.quantity, item_record.sell_price);

    -- Actualizar el stock del producto
    UPDATE public.productos
    SET quantity = quantity - item_record.quantity
    WHERE id = item_record.product_id;
  END LOOP;
  
  -- 4. Crear la nota de entrega para el pedido
  INSERT INTO public.notas_de_entrega (order_id, status)
  VALUES (new_order_id, 'pendiente')
  RETURNING id INTO new_delivery_note_id;


  -- 5. Devolver la información del pedido y la nota de entrega creados
  RETURN jsonb_build_object(
    'success', true,
    'order_id', new_order_id,
    'delivery_note_id', new_delivery_note_id,
    'total', new_order_total
  );
END;
$$;
