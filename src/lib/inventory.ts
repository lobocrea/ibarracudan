import fs from 'fs/promises';
import path from 'path';
import type { Product } from '@/lib/types';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'inventory.json');

export async function getInventory(): Promise<Product[]> {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return data;
  } catch (error) {
    console.error('Failed to read inventory data:', error);
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
    }
    throw new Error('Could not load inventory data.');
  }
}

export async function saveInventory(data: Product[]): Promise<void> {
  try {
    const fileContent = JSON.stringify(data, null, 2);
    await fs.writeFile(dataFilePath, fileContent, 'utf-8');
  } catch (error) {
    console.error('Failed to save inventory data:', error);
    throw new Error('Could not save inventory data.');
  }
}
