import { cookies } from 'next/headers';
import { getInventory } from '@/lib/inventory';
import { ProductTable } from './components/ProductTable';
import { Header } from './components/Header';

export default async function InventoryPage() {
  const inventoryData = await getInventory();
  const loggedInUser = cookies().get('session')?.value || 'Admin';

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={loggedInUser} />
      <main className="flex-1 p-4 md:p-8">
        <ProductTable products={inventoryData} />
      </main>
    </div>
  );
}
