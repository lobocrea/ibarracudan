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
    console.error('Error de validación al añadir producto:', validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const supabase = createClient();
  const { id, ...productData } = validatedFields.data;
  
  console.log('Intentando añadir producto con datos:', productData);

  const { error } = await supabase.from('productos').insert(productData);
  
  if (error) {
    console.error('Error de Supabase al añadir producto:', error);
    return { error: `Error al añadir producto: ${error.message}` };
  }
  
  console.log('Producto añadido con éxito.');
  revalidatePath('/inventory');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateProduct(data: unknown) {
    const formValidation = productSchema.safeParse(data);

    if (!formValidation.success) {
        console.error('Error de validación al actualizar:', formValidation.error.flatten().fieldErrors);
        return {
            errors: formValidation.error.flatten().fieldErrors,
            message: 'Datos del formulario inválidos.'
        };
    }

    const { id, ...productData } = formValidation.data;

    if (!id) {
        console.error('Error crítico: Falta el ID del producto para actualizar.');
        return { error: 'Falta el ID del producto para actualizar.' };
    }
    
    console.log(`Intentando actualizar producto ID: ${id} con datos:`, productData);

    const supabase = createClient();
    const { error } = await supabase
        .from('productos')
        .update(productData)
        .eq('id', id);

    if (error) {
        console.error(`Error de Supabase al actualizar producto ID ${id}:`, error);
        return { error: `Error al actualizar producto: ${error.message}` };
    }

    console.log(`Producto ID: ${id} actualizado con éxito en la base de datos.`);
    revalidatePath('/inventory');
    revalidatePath('/dashboard');
    return { success: true };
}


export async function deleteProduct(productId: string) {
  if (!productId) {
    console.error('Error: Se intentó eliminar un producto sin ID.');
    return { error: 'Falta el ID del producto' };
  }
  
  console.log(`Intentando eliminar producto ID: ${productId}`);
  const supabase = createClient();
  const { error } = await supabase.from('productos').delete().eq('id', productId);
  
  if (error) {
    console.error(`Error de Supabase al eliminar producto ID ${productId}:`, error);
    return { error: error.message };
  }

  console.log(`Producto ID: ${productId} eliminado con éxito.`);
  revalidatePath('/inventory');
  revalidatePath('/dashboard');
  return { success: true };
}
