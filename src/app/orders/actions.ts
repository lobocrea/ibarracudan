'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { OrderItem } from '@/lib/types';

const orderItemSchema = z.object({
  producto_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
});

const createOrderSchema = z.object({
  clientName: z.string().min(1, 'El nombre del cliente es obligatorio'),
  items: z.array(orderItemSchema).min(1, 'El pedido debe tener al menos un producto'),
});

export async function createOrder(data: { clientName: string; items: OrderItem[] }) {
  const validatedFields = createOrderSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { clientName, items } = validatedFields.data;
  const supabase = createClient();

  // The 'handle_new_order' function expects a JSONB object for order_items
  const { error } = await supabase.rpc('handle_new_order', {
    client_name: clientName,
    order_items: items,
  });

  if (error) {
    console.error('Error from RPC:', error);
    return { error: `Error desde la base de datos: ${error.message}` };
  }

  revalidatePath('/orders');
  revalidatePath('/inventory');
  return { success: true };
}
