'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addProduct, updateProduct } from '../actions';
import type { Product } from '@/lib/types';

const productFormSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'El código es obligatorio'),
  quantity: z.coerce.number().int().min(0, 'La cantidad debe ser un entero no negativo'),
  buyPrice: z.coerce.number().min(0, 'El precio de compra debe ser no negativo'),
  sellPrice: z.coerce.number().min(0, 'El precio de venta debe ser no negativo'),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  product?: Product;
}

export function ProductDialog({ isOpen, setIsOpen, product }: ProductDialogProps) {
  const { toast } = useToast();
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      code: '',
      quantity: 0,
      buyPrice: 0,
      sellPrice: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (product) {
        form.reset(product);
      } else {
        form.reset({
          id: undefined,
          code: '',
          quantity: 0,
          buyPrice: 0,
          sellPrice: 0,
        });
      }
    }
  }, [product, form, isOpen]);

  const onSubmit = async (data: ProductFormValues) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const action = product ? updateProduct : addProduct;
    const result = await action(formData);
    
    if (result.success) {
      toast({
        title: `Producto ${product ? 'actualizado' : 'añadido'} con éxito`,
        description: `El producto "${data.code}" ha sido guardado.`,
      });
      setIsOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Ocurrió un error',
        description: result.error || 'Por favor, revisa el formulario e inténtalo de nuevo.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Producto' : 'Añadir Nuevo Producto'}</DialogTitle>
          <DialogDescription>
            {product ? 'Actualiza los detalles de tu producto.' : 'Rellena los detalles del nuevo producto.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {product && <input type="hidden" {...form.register('id')} />}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="PROD001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="buyPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio de Compra</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sellPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio de Venta</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando...' : 'Guardar Producto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
