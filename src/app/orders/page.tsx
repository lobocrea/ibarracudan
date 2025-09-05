import { createClient } from '@/lib/supabase/server';
import { Header } from '@/app/inventory/components/Header';
import { OrderList } from './components/OrderList';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { redirect } from 'next/navigation';
import type { Order, Product } from '@/lib/types';

export default async function OrdersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Corregido: Se simplifica la consulta para que sea más robusta.
  const { data: ordersData, error: ordersError } = await supabase
    .from('pedidos')
    .select('*, items_pedido(*, productos(*))')
    .order('created_at', { ascending: false });

  const { data: inventoryData, error: inventoryError } = await supabase
    .from('productos')
    .select('*')
    .order('code', { ascending: true });

  if (ordersError || inventoryError) {
    // Proporcionar más detalles en el log del servidor
    console.error('Error fetching data:', ordersError || inventoryError);
  }

  const orders: Order[] = ordersData || [];
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalOrders = orders.length;
  const inventory: Product[] = inventoryData || [];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={user} />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ingresos Totales
              </CardTitle>
              <span className="text-muted-foreground text-2xl">€</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </div>
              <p className="text-xs text-muted-foreground">
                Ingresos totales de todos los pedidos
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
               <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{totalOrders}</div>
               <p className="text-xs text-muted-foreground">
                Número total de pedidos creados
              </p>
            </CardContent>
          </Card>
        </div>
        <OrderList orders={orders} inventory={inventory} />
      </main>
    </div>
  );
}
