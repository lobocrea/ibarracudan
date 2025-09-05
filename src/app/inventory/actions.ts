'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/lib/types';

// Unificamos el esquema para que sea consistente en ambos lados.
// El ID es opcional porque no existe al crear un nuevo producto.
const productSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, 'El código es obligatorio'),
  tipo: z.string().nullable().optional(),
  quantity: z.coerce.number().int().min(0, 'La cantidad debe ser un entero no negativo'),
  buy_price: z.coerce.number().min(0, 'El precio de compra debe ser no negativo'),
  sell_price: z.coerce.number().min(0, 'El precio de venta debe ser no negativo'),
});

export async function addProduct(data: unknown) {
  // Omitimos el 'id' del schema para la validación de inserción, 
  // ya que la base de datos lo genera automáticamente.
  const insertSchema = productSchema.omit({ id: true });
  const validatedFields = insertSchema.safeParse(data);

  if (!validatedFields.success) {
    console.error('Error de validación al añadir producto:', validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const supabase = createClient();
  const productData = validatedFields.data;
  
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

export async function updateProduct(data: { id?: string; [key: string]: any }) {
    // Para la actualización, el ID es obligatorio.
    const updateSchema = productSchema.extend({
        id: z.string().uuid('El ID del producto no es válido.'),
    });

    const validatedFields = updateSchema.safeParse(data);

    if (!validatedFields.success) {
        console.error('Error de validación al actualizar:', validatedFields.error.flatten().fieldErrors);
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Datos del formulario inválidos.'
        };
    }

    const { id, ...productData } = validatedFields.data;
    
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


const inventoryUpdateSchema = z.array(z.object({
  code: z.string(),
  quantity: z.coerce.number().int().min(0),
}));

export async function updateInventoryFromCSV(data: unknown) {
  const validation = inventoryUpdateSchema.safeParse(data);

  if (!validation.success) {
    console.error('Invalid CSV data format:', validation.error.flatten().fieldErrors);
    return { error: 'El formato de los datos del CSV es inválido.' };
  }
  
  const supabase = createClient();
  const productsToUpdate = validation.data;

  console.log(`Iniciando actualización masiva de inventario para ${productsToUpdate.length} productos.`);

  const errors: { code: string; message: string }[] = [];
  
  for (const product of productsToUpdate) {
    // Usamos `eq` para encontrar el producto por su código y actualizar la cantidad.
    const { error } = await supabase
      .from('productos')
      .update({ quantity: product.quantity })
      .eq('code', product.code);

    if (error) {
      const errorMessage = `Error actualizando el producto con código ${product.code}: ${error.message}`;
      console.error(errorMessage);
      errors.push({ code: product.code, message: error.message });
    }
  }

  if (errors.length > 0) {
    const errorMessage = `Ocurrieron errores al actualizar ${errors.length} producto(s). Revisa la consola del servidor para más detalles.`;
    console.error("Errores en actualización masiva:", errors);
    return { error: errorMessage };
  }
  
  console.log('Actualización masiva de inventario completada con éxito.');
  revalidatePath('/inventory');
  revalidatePath('/dashboard');
  return { success: true };
}
