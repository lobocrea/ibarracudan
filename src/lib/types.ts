export type Product = {
  id: string; // uuid
  code: string;
  tipo: string | null;
  quantity: number;
  buy_price: number;
  sell_price: number;
};

export type OrderItem = {
  producto_id: string; // uuid
  quantity: number;
};

export type Order = {
  id: string; // uuid
  created_at: string;
  client_name: string | null;
  client_address: string | null;
  client_phone: string | null;
  client_id_number: string | null;
  total: number | null;
  user_id: string | null; // uuid
  items_pedido: OrderItemDetail[];
};

export type OrderItemDetail = {
  id: string; // uuid
  pedido_id: string; // uuid
  producto_id: string; // uuid
  quantity: number;
  sell_price: number;
  productos: {
    code: string;
    tipo: string | null;
  };
};
