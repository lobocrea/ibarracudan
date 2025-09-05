export type Product = {
  id: string;
  code: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
};

export type OrderItem = {
  productId: string;
  code: string;
  quantity: number;
  sellPrice: number;
};

export type Order = {
  id: string;
  clientName: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
};
