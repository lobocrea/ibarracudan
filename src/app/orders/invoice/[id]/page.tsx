import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import type { Order } from '@/lib/types';
import { Invoice } from './components/Invoice';

async function getOrder(id: string): Promise<Order | null> {
  const supabase = createClient();
  const { data: order, error } = await supabase
    .from('pedidos')
    .select('*, items_pedido(*, productos(*))')
    .eq('id', id)
    .single();

  if (error || !order) {
    console.error('Error fetching order for invoice:', error);
    return null;
  }
  
  return order as Order;
}


export default async function InvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const order = await getOrder(params.id);

  if (!order) {
    notFound();
  }

  return <Invoice order={order} />;
}
