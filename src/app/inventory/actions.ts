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
  // Excluimos 'id' porque es autogenerado por la BD al insertar
  const { id, ...productData } = validatedFields.data;

  const { error } = await supabase.from('productos').insert(productData);
  
  if (error) {
    console.error('Add product error:', error);
    return { error: `Error al añadir producto: ${error.message}` };
  }

  revalidatePath('/inventory');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateProduct(data: unknown) {
    // Primero, validamos la estructura general de los datos que vienen del formulario.
    const formValidation = productSchema.safeParse(data);

    if (!formValidation.success) {
        return {
            errors: formValidation.error.flatten().fieldErrors,
        };
    }

    // El ID viene del formulario y es crucial para la cláusula WHERE.
    const { id } = formValidation.data;

    if (!id) {
        return { error: 'Falta el ID del producto para actualizar.' };
    }

    // Preparamos los datos para la actualización, excluyendo el ID del payload.
    const { id: _, ...productData } = formValidation.data;

    const supabase = createClient();
    const { error } = await supabase
        .from('productos')
        .update(productData) // El objeto a actualizar no debe contener el ID.
        .eq('id', id);      // El ID se usa aquí para identificar la fila.

    if (error) {
        console.error('Update error:', error);
        return { error: `Error al actualizar producto: ${error.message}` };
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
