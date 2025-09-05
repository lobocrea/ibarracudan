-- 1. Crear la tabla de Productos
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    quantity INT NOT NULL CHECK (quantity >= 0),
    buy_price NUMERIC(10, 2) NOT NULL CHECK (buy_price >= 0),
    sell_price NUMERIC(10, 2) NOT NULL CHECK (sell_price >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Crear la tabla de Pedidos
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    delivery_note_id UUID -- Se actualizará después con el ID de la nota de entrega
);

-- 3. Crear la tabla de Items de Pedido (tabla pivote)
CREATE TABLE items_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    sell_price NUMERIC(10, 2) NOT NULL
);

-- 4. Crear la tabla de Notas de Entrega
CREATE TABLE notas_de_entrega (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES pedidos(id) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    content TEXT -- Aquí se podría guardar un resumen o el estado
);

-- 5. Habilitar Row Level Security (RLS) en las tablas
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_de_entrega ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas de RLS para permitir el acceso solo a usuarios autenticados
-- (Ejemplo: cualquiera autenticado puede ver y hacer de todo. Ajusta según tus necesidades)
CREATE POLICY "Permitir acceso total a usuarios autenticados en productos"
ON productos
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acceso total a usuarios autenticados en pedidos"
ON pedidos
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acceso total a usuarios autenticados en items_pedido"
ON items_pedido
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acceso total a usuarios autenticados en notas_de_entrega"
ON notas_de_entrega
FOR ALL
USING (auth.role() = 'authenticated');


-- 7. Función para crear un pedido y generar nota de entrega
CREATE OR REPLACE FUNCTION public.crear_pedido_con_nota(
    client_name_param TEXT,
    items_param JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    nuevo_pedido_id UUID;
    nueva_nota_id UUID;
    total_pedido NUMERIC(10, 2) := 0;
    item JSONB;
    producto_id_val UUID;
    cantidad_val INT;
    precio_venta_val NUMERIC(10, 2);
    stock_actual INT;
    producto_code TEXT;
BEGIN
    -- Crear el nuevo pedido
    INSERT INTO pedidos (client_name, total)
    VALUES (client_name_param, 0)
    RETURNING id INTO nuevo_pedido_id;

    -- Iterar sobre los items para actualizar stock y calcular total
    FOR item IN SELECT * FROM jsonb_array_elements(items_param)
    LOOP
        producto_id_val := (item->>'productId')::UUID;
        cantidad_val := (item->>'quantity')::INT;
        
        -- Validar stock y obtener precio de venta y código
        SELECT quantity, sell_price, code INTO stock_actual, precio_venta_val, producto_code
        FROM productos
        WHERE id = producto_id_val
        FOR UPDATE; -- Bloquear la fila del producto para evitar concurrencia

        IF stock_actual IS NULL THEN
            RAISE EXCEPTION 'Producto con ID % no encontrado', producto_id_val;
        END IF;

        IF stock_actual < cantidad_val THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto %. Disponible: %, Solicitado: %', producto_code, stock_actual, cantidad_val;
        END IF;

        -- Actualizar el stock del producto
        UPDATE productos
        SET quantity = quantity - cantidad_val
        WHERE id = producto_id_val;

        -- Insertar el item en la tabla de items_pedido
        INSERT INTO items_pedido (pedido_id, producto_id, quantity, sell_price)
        VALUES (nuevo_pedido_id, producto_id_val, cantidad_val, precio_venta_val);

        -- Acumular el total
        total_pedido := total_pedido + (cantidad_val * precio_venta_val);
    END LOOP;

    -- Actualizar el total del pedido
    UPDATE pedidos
    SET total = total_pedido
    WHERE id = nuevo_pedido_id;

    -- Crear la nota de entrega
    INSERT INTO notas_de_entrega (pedido_id, content)
    VALUES (nuevo_pedido_id, 'Nota de entrega para el pedido de ' || client_name_param)
    RETURNING id INTO nueva_nota_id;
    
    -- Vincular la nota de entrega al pedido
    UPDATE pedidos
    SET delivery_note_id = nueva_nota_id
    WHERE id = nuevo_pedido_id;

    -- Devolver el ID del nuevo pedido
    RETURN jsonb_build_object('success', true, 'pedido_id', nuevo_pedido_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- 8. Datos iniciales para productos (los datos de tu tabla)
-- (Nota: Se generarán nuevos UUIDs para los IDs)
INSERT INTO productos (code, description, quantity, buy_price, sell_price) VALUES
('CT-500 1H', 'LCL240-13 ( 500 mcm )', 100, 10.00, 20.00),
('CT-2 1H', 'LCL35-12 (2 AWG)', 100, 10.00, 20.00),
('CT-2/0 1H', 'LCL70-12 (2/0 AWG)', 100, 10.00, 20.00),
('CT-4/0 1H', 'LCL120-13 (4/0 AWG)', 100, 10.00, 20.00),
('CT-4 1H', 'LCL25-6 (4 AWG)', 100, 10.00, 20.00),
('CT-8 1H', 'LCL10-6 (8 AWG)', 100, 10.00, 20.00),
('CT-250 1H', 'LCL120-13 ( 250 mcm)', 100, 10.00, 20.00),
('CT-6 1H', 'LCL16-6 (6 AWG)', 100, 10.00, 20.00),
('CT-1/0 1H', 'LCL50-12 (1/0 AWG)', 100, 10.00, 20.00),
('CT-350 1H', 'LCL185-13 ( 350 mcm)', 100, 10.00, 20.00),
('CT-4/0 2H', 'TTL120-13 (4/0 AWG)', 100, 10.00, 20.00),
('PTNB 10-12', '(AWG 8)', 100, 10.00, 20.00),
('CT-500 2H', 'TTL240-13 ( 500 mcm)', 100, 10.00, 20.00),
('PTNB 16-13', '(AWG 6)', 100, 10.00, 20.00),
('CT-350 2H', 'TTL185-13 ( 350 mcm)', 100, 10.00, 20.00),
('2-T', 'GTY35', 100, 10.00, 20.00),
('CT-2/0 2H', 'TTL70-12 (2/0 AWG)', 100, 10.00, 20.00),
('CT-250 2H', 'TTL120-13 ( 250 mcm)', 100, 10.00, 20.00),
('CT-3/0 1H', 'LCL95-12 (3/0 AWG)', 100, 10.00, 20.00),
('500-T', 'GTY240', 100, 10.00, 20.00),
('CT-750 2H', 'TTL400-13 ( 750 mcm)', 100, 10.00, 20.00),
('CT-1000 2H', 'TTL500-13 ( 1000 mcm)', 100, 10.00, 20.00),
('6-T', 'GTY16', 100, 10.00, 20.00),
('4-T', 'GTY25', 100, 10.00, 20.00),
('CT-1/0 2H', 'TTL50-12 (1/0 AWG)', 100, 10.00, 20.00),
('2/0-T', 'GTY70', 100, 10.00, 20.00),
('1/0-T', 'GTY50', 100, 10.00, 20.00),
('CT-2 2H', 'TTL35-12 (2 AWG)', 100, 10.00, 20.00),
('250-T', 'GTY150', 100, 10.00, 20.00),
('YQK-300', 'PRENSA YQK-300', 100, 10.00, 20.00),
('350-T', 'GTY185', 100, 10.00, 20.00),
('4/0-T', 'GTY120', 100, 10.00, 20.00),
('8-T', 'GTY10', 100, 10.00, 20.00),
('HX-50B', 'PRENSA HX-50B', 100, 10.00, 20.00),
('HS-D1', 'PELA CABLE HS-D1', 100, 10.00, 20.00),
('CT-750 1H', 'LCL400-13 ( 750 mcm)', 100, 10.00, 20.00),
('J52', 'CORTA CABLE - J52', 100, 10.00, 20.00),
('EB-630', 'Electric Hydraulic Crimping tool', 100, 10.00, 20.00),
('CT-1000 1H', 'LCL500-13 ( 1000 mcm)', 100, 10.00, 20.00),
('3/0-T', 'GTY95', 100, 10.00, 20.00),
('SYK-15', 'PONCHADORA SYK-15', 100, 10.00, 20.00),
('CTC-350', 'YAL185 (350MCM)', 100, 10.00, 20.00),
('CTC-500', 'YAL240 (500MCM)', 100, 10.00, 20.00),
('PTNB 25-15', '(AWG 4)', 100, 10.00, 20.00),
('PTNB 35-20', '(AWG 2)', 100, 10.00, 20.00),
('CT-3/0 2H', 'TTL95-12 (3/0 AWG)', 100, 10.00, 20.00);

-- Renombrar columnas buyPrice y sellPrice en tabla productos
ALTER TABLE productos RENAME COLUMN buyprice TO buy_price;
ALTER TABLE productos RENAME COLUMN sellprice TO sell_price;

-- Renombrar columnas clientName y createdAt en tabla pedidos
ALTER TABLE pedidos RENAME COLUMN clientname TO client_name;
ALTER TABLE pedidos RENAME COLUMN createdat TO created_at;

-- Renombrar columnas productId y sellPrice en tabla items_pedido
ALTER TABLE items_pedido RENAME COLUMN productid TO producto_id;
ALTER TABLE items_pedido RENAME COLUMN sellprice TO sell_price;

-- Renombrar columna createdAt en tabla notas_de_entrega
ALTER TABLE notas_de_entrega RENAME COLUMN createdat TO created_at;
