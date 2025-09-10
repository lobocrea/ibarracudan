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
  clientAddress: z.string().optional(),
  clientPhone: z.string().optional(),
  clientIdNumber: z.string().optional(),
  payment_method: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'El pedido debe tener al menos un producto'),
});

export async function createOrder(data: { 
  clientName: string; 
  clientAddress?: string;
  clientPhone?: string;
  clientIdNumber?: string;
  payment_method?: string;
  items: OrderItem[] 
}) {
  const validatedFields = createOrderSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { clientName, clientAddress, clientPhone, clientIdNumber, payment_method, items } = validatedFields.data;
  const supabase = await createClient();

  const { error } = await supabase.rpc('handle_new_order', {
    p_client_name: clientName,
    p_client_address: clientAddress,
    p_client_phone: clientPhone,
    p_client_id_number: clientIdNumber,
    p_payment_method: payment_method,
    p_order_items: items,
  });

  if (error) {
    console.error('Error from RPC:', error);
    return { error: `Error desde la base de datos: ${error.message}` };
  }

  revalidatePath('/orders');
  revalidatePath('/inventory');
  revalidatePath('/dashboard');
  return { success: true };
}
