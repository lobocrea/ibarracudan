'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getInventory, saveInventory } from '@/lib/inventory';
import type { Product } from '@/lib/types';

const productSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Code is required'),
  type: z.string().min(1, 'Type is required'),
  quantity: z.coerce.number().min(0, 'Quantity must be non-negative'),
  buyPrice: z.coerce.number().min(0, 'Buy price must be non-negative'),
  sellPrice: z.coerce.number().min(0, 'Sell price must be non-negative'),
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
    image: `https://picsum.photos/400/400?random=${Math.random()}`,
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
    return { error: 'Product ID is missing' };
  }

  const inventory = await getInventory();
  const productIndex = inventory.findIndex(p => p.id === id);

  if (productIndex === -1) {
    return { error: 'Product not found' };
  }
  
  const existingProduct = inventory[productIndex];
  inventory[productIndex] = { ...existingProduct, ...productData };

  await saveInventory(inventory);
  revalidatePath('/inventory');
  return { success: true };
}

export async function deleteProduct(productId: string) {
  if (!productId) {
    return { error: 'Product ID is missing' };
  }
  
  const inventory = await getInventory();
  const updatedInventory = inventory.filter(p => p.id !== productId);

  if (inventory.length === updatedInventory.length) {
     return { error: 'Product not found' };
  }

  await saveInventory(updatedInventory);
  revalidatePath('/inventory');
  return { success: true };
}
