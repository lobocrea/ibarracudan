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
import { MoreHorizontal, Plus, PlusCircle, Upload, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { ProductDialog } from './ProductDialog';
import { DeleteProductDialog } from './DeleteProductDialog';
import { UpdateInventoryDialog } from './UpdateInventoryDialog';
import type { Product } from '@/lib/types';
import Papa from 'papaparse';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';


export function ProductTable({ products }: { products: Product[] }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [updateInventoryDialogOpen, setUpdateInventoryDialogOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | undefined>(undefined);
  const isMobile = useIsMobile();

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };
  
  const handleAddNew = () => {
    setSelectedProduct(undefined);
    setDialogOpen(true);
  };
  
  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleOpenUpdateInventoryDialog = () => {
    setUpdateInventoryDialogOpen(true);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleExport = () => {
    const csv = Papa.unparse(products.map(p => ({
        code: p.code,
        tipo: p.tipo,
        quantity: p.quantity,
        buy_price: p.buy_price,
        sell_price: p.sell_price,
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `inventario_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
                <CardTitle>Productos</CardTitle>
                <CardDescription>Gestiona el inventario de tus productos.</CardDescription>
            </div>
            <div className={cn("hidden items-center gap-2 md:flex", isMobile && 'hidden')}>
              <Button onClick={handleOpenUpdateInventoryDialog} variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Importar CSV
              </Button>
               <Button onClick={handleExport} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar a CSV
              </Button>
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Producto
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio de Compra</TableHead>
                  <TableHead className="text-right">Precio de Venta</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length > 0 ? (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.code}</TableCell>
                      <TableCell>{product.tipo}</TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.buy_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.sell_price)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Alternar menú</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleEdit(product)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDelete(product)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No se encontraron productos. Añade uno nuevo para empezar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {isMobile && (
         <div className="fixed bottom-4 right-4 z-40">
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button size="icon" className="rounded-full h-14 w-14 shadow-lg">
                      <Plus className="h-6 w-6" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="mb-2">
                  <DropdownMenuItem onSelect={handleAddNew}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Añadir Producto
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleOpenUpdateInventoryDialog}>
                      <Upload className="mr-2 h-4 w-4" />
                      Importar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleExport}>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar a CSV
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
         </div>
      )}
      
      <ProductDialog 
        isOpen={dialogOpen} 
        setIsOpen={setDialogOpen} 
        product={selectedProduct}
      />

      <UpdateInventoryDialog
        isOpen={updateInventoryDialogOpen}
        setIsOpen={setUpdateInventoryDialogOpen}
      />
      
      {selectedProduct && (
        <DeleteProductDialog 
          isOpen={deleteDialogOpen}
          setIsOpen={setDeleteDialogOpen}
          product={selectedProduct}
        />
      )}
    </>
  );
}
