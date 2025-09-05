import { createClient } from '@/lib/supabase/server';
import { Header } from '@/app/inventory/components/Header';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowDown, ArrowUp, Euro, Package } from 'lucide-react';
import type { Product, Order } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

async function getDashboardData() {
    const supabase = createClient();

    const { data: products, error: productsError } = await supabase
        .from('productos')
        .select('*');

    const { data: ordersData, error: ordersError } = await supabase
        .from('pedidos')
        .select('*, items_pedido(*, productos(buy_price))')
        .order('created_at', { ascending: false });

    if (productsError || ordersError) {
        console.error('Error fetching dashboard data:', productsError || ordersError);
        return { products: [], orders: [], lowStockProducts: [], recentSales: [] };
    }

    const orders = ordersData as (Order & { items_pedido: { quantity: number, productos: { buy_price: number } }[] })[];
    const lowStockProducts = (products || []).filter(p => p.quantity < 10);
    
    const recentSales = (orders || [])
        .flatMap(order => 
            order.items_pedido.map(item => ({
                ...item,
                product_id: (item as any).producto_id,
            }))
        )
        .slice(0, 5); // Get last 5 sold items

    return {
        products: products || [],
        orders: orders || [],
        lowStockProducts,
        recentSales,
    };
}


export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { products, orders, lowStockProducts, recentSales } = await getDashboardData();
  
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalCost = orders.reduce((sum, order) => {
    return sum + order.items_pedido.reduce((itemSum, item) => {
        return itemSum + (item.productos.buy_price * item.quantity);
    }, 0);
  }, 0);
  const totalProfit = totalRevenue - totalCost;
  const inventoryValue = products.reduce((sum, product) => sum + (product.buy_price * product.quantity), 0);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };
  
  const getProductById = (id: string) => products.find(p => p.id === id);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={user} />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        {lowStockProducts.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>¡Alerta de Stock Bajo!</AlertTitle>
            <AlertDescription>
              Hay {lowStockProducts.length} producto(s) con menos de 10 unidades. Revisa tu inventario.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <Euro className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">Total de ventas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Beneficio Bruto</CardTitle>
              <ArrowUp className="text-green-500 h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalProfit)}</div>
              <p className="text-xs text-muted-foreground">Ingresos menos costes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coste de Bienes</CardTitle>
              <ArrowDown className="text-red-500 h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
              <p className="text-xs text-muted-foreground">Coste total de productos vendidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor del Inventario</CardTitle>
              <Package className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(inventoryValue)}</div>
              <p className="text-xs text-muted-foreground">Valor total del stock actual</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Productos con Stock Bajo (&lt;10)</CardTitle>
                    <CardDescription>Estos productos necesitan ser reabastecidos pronto.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Stock Actual</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lowStockProducts.length > 0 ? lowStockProducts.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.code}</TableCell>
                                    <TableCell className="text-right"><Badge variant="destructive">{p.quantity}</Badge></TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">¡Buen trabajo! No hay productos con stock bajo.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Ventas Recientes</CardTitle>
                    <CardDescription>Los últimos 5 productos vendidos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Cantidad Vendida</TableHead>
                                <TableHead className="text-right">Stock Restante</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {recentSales.length > 0 ? recentSales.map((item, index) => {
                                const product = getProductById((item as any).producto_id);
                                return product ? (
                                    <TableRow key={`${(item as any).id}-${index}`}>
                                        <TableCell>{product.code}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={product.quantity < 10 ? 'destructive' : 'outline'}>
                                                {product.quantity}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ) : null;
                             }) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">No hay ventas recientes.</TableCell>
                                </TableRow>
                             )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
