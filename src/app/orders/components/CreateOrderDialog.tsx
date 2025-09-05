'use client';

import * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createOrder } from '../actions';
import type { Product, OrderItem } from '@/lib/types';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const orderItemSchema = z.object({
  productId: z.string().min(1),
  code: z.string(),
  quantity: z.coerce.number().int().min(1, "Mínimo 1"),
  sellPrice: z.coerce.number(),
  stock: z.coerce.number(),
});

const orderFormSchema = z.object({
  clientName: z.string().min(2, 'El nombre es obligatorio'),
  items: z.array(orderItemSchema).min(1, "Añade al menos un producto."),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface CreateOrderDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  inventory: Product[];
}

export function CreateOrderDialog({ isOpen, setIsOpen, inventory }: CreateOrderDialogProps) {
  const { toast } = useToast();
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      clientName: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const availableProducts = inventory.filter(p => p.quantity > 0);
  
  const selectedProductIds = form.watch('items').map(item => item.productId);

  const onSubmit = async (data: OrderFormValues) => {
    const result = await createOrder(data);

    if (result.success) {
      toast({
        title: 'Pedido creado con éxito',
        description: `El pedido para ${data.clientName} ha sido creado.`,
      });
      setIsOpen(false);
      form.reset();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error al crear el pedido',
        description: result.error || 'Por favor, inténtalo de nuevo.',
      });
    }
  };
  
  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const total = form.watch('items').reduce((acc, item) => acc + (item.quantity * item.sellPrice), 0);
  
  const handleAddProduct = () => {
    const firstAvailable = availableProducts.find(p => !selectedProductIds.includes(p.id));
    if (firstAvailable) {
        append({ 
            productId: firstAvailable.id, 
            code: firstAvailable.code, 
            quantity: 1, 
            sellPrice: firstAvailable.sellPrice,
            stock: firstAvailable.quantity,
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'No hay más productos disponibles',
        })
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Pedido</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <ScrollArea className="h-[50vh] pr-4">
                <div className="space-y-4 py-4">
                    <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nombre del Cliente</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Juan Pérez" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    
                    <div>
                        <FormLabel>Productos</FormLabel>
                        <div className="space-y-4 mt-2">
                        {fields.map((field, index) => {
                           const currentProduct = inventory.find(p => p.id === form.watch(`items.${index}.productId`));
                           const maxQuantity = currentProduct?.quantity ?? 0;
                           return (
                            <div key={field.id} className="flex items-end gap-2 p-3 border rounded-lg">
                                <Controller
                                    control={form.control}
                                    name={`items.${index}.productId`}
                                    render={({ field: selectField }) => (
                                    <FormItem className="flex-1">
                                    <FormLabel>Producto</FormLabel>
                                        <Select
                                            onValueChange={(value) => {
                                                const product = inventory.find(p => p.id === value);
                                                if(product) {
                                                    form.setValue(`items.${index}.code`, product.code);
                                                    form.setValue(`items.${index}.sellPrice`, product.sellPrice);
                                                    form.setValue(`items.${index}.stock`, product.quantity);
                                                    form.setValue(`items.${index}.quantity`, 1);
                                                    selectField.onChange(value);
                                                }
                                            }}
                                            defaultValue={selectField.value}
                                        >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un producto" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {availableProducts.map(p => (
                                                <SelectItem key={p.id} value={p.id} disabled={selectedProductIds.includes(p.id) && p.id !== field.productId}>
                                                    {p.code} (Disp: {p.quantity}) - {p.sellPrice.toFixed(2)}€
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />

                                <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field: quantityField }) => (
                                    <FormItem className="w-28">
                                    <FormLabel>Cantidad</FormLabel>
                                    <FormControl>
                                        <Input type="number" min="1" max={maxQuantity} {...quantityField} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />

                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                           )
                        })}
                        </div>
                         {form.formState.errors.items && (
                            <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.items.message}</p>
                        )}
                    </div>
                    
                    <Button type="button" variant="outline" size="sm" onClick={handleAddProduct} disabled={fields.length >= availableProducts.length}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Producto
                    </Button>
                </div>
            </ScrollArea>
            <DialogFooter className="pt-6 border-t flex-col sm:flex-row sm:justify-between items-center">
                <div className="text-xl font-bold">
                    Total: {total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Creando Pedido...' : 'Crear Pedido'}
                    </Button>
                </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
