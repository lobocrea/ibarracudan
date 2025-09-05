import fs from 'fs/promises';
import path from 'path';
import type { Order } from '@/lib/types';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'orders.json');

export async function getOrders(): Promise<Order[]> {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return data.sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        await saveOrders([]);
        return [];
    }
    console.error('Failed to read orders data:', error);
    throw new Error('Could not load orders data.');
  }
}

export async function saveOrders(data: Order[]): Promise<void> {
  try {
    const fileContent = JSON.stringify(data, null, 2);
    await fs.writeFile(dataFilePath, fileContent, 'utf-8');
  } catch (error) {
    console.error('Failed to save orders data:', error);
    throw new Error('Could not save orders data.');
  }
}
