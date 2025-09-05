import { createClient } from '@/lib/supabase/server';
import { ProductTable } from './components/ProductTable';
import { Header } from './components/Header';
import { redirect } from 'next/navigation';

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: products, error } = await supabase
    .from('productos')
    .select('*')
    .order('code', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    // Handle error appropriately
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={user} />
      <main className="flex-1 p-4 md:p-8">
        <ProductTable products={products || []} />
      </main>
    </div>
  );
}
