'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteProduct } from '../actions';
import type { Product } from '@/lib/types';
import * as React from 'react';

interface DeleteProductDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  product: Product;
}

export function DeleteProductDialog({ isOpen, setIsOpen, product }: DeleteProductDialogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteProduct(product.id);
    if (result.success) {
      toast({
        title: 'Producto eliminado con éxito',
      });
      setIsOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error al eliminar el producto',
        description: result.error || 'Por favor, inténtalo de nuevo.',
      });
    }
    setIsDeleting(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro de que quieres eliminar este producto?</AlertDialogTitle>
          <AlertDialogDescription>
            Esto eliminará permanentemente el producto con el código <span className="font-semibold">{product.code}</span>. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
