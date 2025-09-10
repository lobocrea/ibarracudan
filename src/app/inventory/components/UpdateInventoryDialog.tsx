'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateInventoryFromCSV } from '../actions';
import Papa from 'papaparse';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileWarning } from 'lucide-react';

interface UpdateInventoryDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const csvRowSchema = z.object({
  code: z.string().min(1),
  quantity: z.coerce.number().int().min(0),
});

export function UpdateInventoryDialog({ isOpen, setIsOpen }: UpdateInventoryDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleProcessFile = async () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No se ha seleccionado ningún archivo',
        description: 'Por favor, selecciona un archivo CSV para continuar.',
      });
      return;
    }

    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim(),
      complete: async (results) => {
        const parsedData = z.array(csvRowSchema).safeParse(results.data);
        
        if (!parsedData.success) {
            console.error("Error de validación de CSV:", parsedData.error.flatten());
            toast({
                variant: 'destructive',
                title: 'Error en el formato del archivo CSV',
                description: 'Asegúrate de que el archivo tiene las columnas "code" y "quantity" con el formato correcto.',
            });
            setIsProcessing(false);
            return;
        }

        const result = await updateInventoryFromCSV(parsedData.data);
        
        if (result.success) {
          toast({
            title: 'Inventario actualizado con éxito',
            description: 'Las cantidades de los productos han sido actualizadas.',
          });
          setIsOpen(false);
          setFile(null);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error al actualizar el inventario',
            description: result.error || 'Ocurrió un error inesperado.',
          });
        }
        setIsProcessing(false);
      },
      error: (error) => {
        toast({
          variant: 'destructive',
          title: 'Error al leer el archivo',
          description: error.message,
        });
        setIsProcessing(false);
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Actualizar Inventario desde CSV</DialogTitle>
          <DialogDescription>
            Selecciona un archivo CSV para actualizar las cantidades de tu inventario. El archivo debe tener las columnas: "code" y "quantity".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Alert>
            <FileWarning className="h-4 w-4" />
            <AlertTitle>¡Atención!</AlertTitle>
            <AlertDescription>
                Esta acción sobrescribirá la cantidad de los productos existentes que coincidan con el código del CSV. No añadirá nuevos productos.
            </AlertDescription>
          </Alert>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="csv-file">Archivo CSV</Label>
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleProcessFile} disabled={!file || isProcessing}>
            {isProcessing ? 'Procesando...' : 'Actualizar Inventario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
