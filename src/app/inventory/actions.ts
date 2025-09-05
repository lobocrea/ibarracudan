'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/lib/types';

// Unificamos el esquema para que sea consistente en ambos lados
const productSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, 'El código es obligatorio'),
  tipo: z.string().nullable().optional(),
  quantity: z.coerce.number().int().min(0, 'La cantidad debe ser un entero no negativo'),
  buy_price: z.coerce.number().min(0, 'El precio de compra debe ser no negativo'),
  sell_price: z.coerce.number().min(0, 'El precio de venta debe ser no negativo'),
});

export async function addProduct(data: unknown) {
  const validatedFields = productSchema.safeParse(data);

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

export async function updateProduct(data: unknown) {
  const validatedFields = productSchema.safeParse(data);

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
