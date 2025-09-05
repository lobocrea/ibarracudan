'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getInventory, saveInventory } from '@/lib/inventory';
import type { Product } from '@/lib/types';

const productSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'El código es obligatorio'),
  quantity: z.coerce.number().min(0, 'La cantidad debe ser no negativa'),
  buyPrice: z.coerce.number().min(0, 'El precio de compra debe ser no negativo'),
  sellPrice: z.coerce.number().min(0, 'El precio de venta debe ser no negativo'),
});

export async function addProduct(formData: FormData) {
  const validatedFields = productSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const inventory = await getInventory();
  const newProduct: Product = {
    ...validatedFields.data,
    id: new Date().getTime().toString(),
  };

  await saveInventory([newProduct, ...inventory]);
  revalidatePath('/inventory');
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

  const inventory = await getInventory();
  const productIndex = inventory.findIndex(p => p.id === id);

  if (productIndex === -1) {
    return { error: 'Producto no encontrado' };
  }
  
  const existingProduct = inventory[productIndex];
  inventory[productIndex] = { ...existingProduct, ...productData };

  await saveInventory(inventory);
  revalidatePath('/inventory');
  return { success: true };
}

export async function deleteProduct(productId: string) {
  if (!productId) {
    return { error: 'Falta el ID del producto' };
  }
  
  const inventory = await getInventory();
  const updatedInventory = inventory.filter(p => p.id !== productId);

  if (inventory.length === updatedInventory.length) {
     return { error: 'Producto no encontrado' };
  }

  await saveInventory(updatedInventory);
  revalidatePath('/inventory');
  return { success: true };
}
