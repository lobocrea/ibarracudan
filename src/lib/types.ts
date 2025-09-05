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
  id: number; // bigint
  created_at: string;
  client_name: string | null;
  total: number | null;
  user_id: string | null; // uuid
  items_pedido: OrderItemDetail[];
};

export type OrderItemDetail = {
  id: number;
  pedido_id: number;
  producto_id: string;
  quantity: number;
  sell_price: number;
  productos: {
    code: string;
    tipo: string | null;
  }
}
