import { cookies } from 'next/headers';
import { getOrders } from '@/lib/orders';
import { getInventory } from '@/lib/inventory';
import { Header } from '@/app/inventory/components/Header';
import { OrderList } from './components/OrderList';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function OrdersPage() {
  const orders = await getOrders();
  const inventory = await getInventory();
  const loggedInUser = cookies().get('session')?.value || 'Admin';

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = orders.length;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={loggedInUser} />
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
                <rect width="16" height="16" x="4" y="4" rx="2" ry="2" />
                <path d="M9 4v16" />
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
