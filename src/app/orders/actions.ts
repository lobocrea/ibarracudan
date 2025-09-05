'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getOrders, saveOrders } from '@/lib/orders';
import { getInventory, saveInventory } from '@/lib/inventory';
import type { Order, OrderItem, Product } from '@/lib/types';

const orderItemSchema = z.object({
  productId: z.string(),
  code: z.string(),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1"),
  sellPrice: z.coerce.number(),
});

const createOrderSchema = z.object({
  clientName: z.string().min(1, 'El nombre del cliente es obligatorio'),
  items: z.array(orderItemSchema).min(1, "El pedido debe tener al menos un producto"),
});


export async function createOrder(data: { clientName: string, items: OrderItem[]}) {
  const validatedFields = createOrderSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { clientName, items } = validatedFields.data;

  const inventory = await getInventory();
  const orders = await getOrders();
  
  const total = items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);

  // Check stock and update inventory
  const updatedInventory = [...inventory];
  for (const item of items) {
    const productIndex = updatedInventory.findIndex(p => p.id === item.productId);
    if (productIndex === -1) {
      return { error: `Producto con código ${item.code} no encontrado.` };
    }
    if (updatedInventory[productIndex].quantity < item.quantity) {
      return { error: `Stock insuficiente para el producto ${item.code}. Disponible: ${updatedInventory[productIndex].quantity}` };
    }
    updatedInventory[productIndex].quantity -= item.quantity;
  }
  
  const newOrder: Order = {
    id: new Date().getTime().toString(),
    clientName,
    items,
    total,
    createdAt: new Date().toISOString(),
  };

  await saveInventory(updatedInventory);
  await saveOrders([newOrder, ...orders]);

  revalidatePath('/orders');
  revalidatePath('/inventory');
  return { success: true, order: newOrder };
}
