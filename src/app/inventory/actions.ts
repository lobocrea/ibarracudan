'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/lib/types';

const productSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, 'El código es obligatorio'),
  tipo: z.string().optional(),
  quantity: z.coerce.number().min(0, 'La cantidad debe ser no negativa'),
  buy_price: z.coerce.number().min(0, 'El precio de compra debe ser no negativo'),
  sell_price: z.coerce.number().min(0, 'El precio de venta debe ser no negativo'),
});

export async function addProduct(formData: FormData) {
  const validatedFields = productSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const supabase = createClient();
  const { id, ...productData } = validatedFields.data;

  const { error } = await supabase.from('productos').insert(productData);
  
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/inventory');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateProduct(formData: FormData) {
  const validatedFields = productSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { id, ...productData } = validatedFields.data;

  if (!id) {
    return { error: 'Falta el ID del producto' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('productos').update(productData).eq('id', id);

  if (error) {
    console.error('Update error:', error);
    return { error: error.message };
  }

  revalidatePath('/inventory');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteProduct(productId: string) {
  if (!productId) {
    return { error: 'Falta el ID del producto' };
  }
  
  const supabase = createClient();
  const { error } = await supabase.from('productos').delete().eq('id', productId);
  
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/inventory');
  revalidatePath('/dashboard');
  return { success: true };
}
