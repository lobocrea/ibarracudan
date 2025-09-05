'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { CreateOrderDialog } from './CreateOrderDialog';
import type { Order, Product } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';


export function OrderList({ orders, inventory }: { orders: Order[], inventory: Product[] }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM, yyyy 'a las' HH:mm", { locale: es });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pedidos</CardTitle>
              <CardDescription>Consulta y gestiona los pedidos de tus clientes.</CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} disabled={inventory.filter(p => p.quantity > 0).length === 0}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Pedido
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Nº de Productos</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>{order.client_name}</TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell>
                        <Badge variant="outline">{order.items_pedido.length} producto(s)</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(order.total || 0)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Alternar menú</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No se encontraron pedidos. Crea uno nuevo para empezar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <CreateOrderDialog 
        isOpen={dialogOpen} 
        setIsOpen={setDialogOpen} 
        inventory={inventory}
      />
    </>
  );
}
