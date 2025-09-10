'use client';
import { useEffect } from 'react';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

interface InvoiceProps {
    order: Order;
}

export function Invoice({ order }: InvoiceProps) {
    useEffect(() => {
        // Automatically trigger print dialog when component mounts
        window.print();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };
    
    const formatDate = (dateString: string) => {
        return formatInTimeZone(dateString, 'UTC', 'dd MMMM, yyyy', { locale: es });
    };

    const getOrderIdSuffix = (orderId: string) => {
        return orderId.slice(-6).toUpperCase();
    }

    return (
        <div className="bg-background text-foreground min-h-screen">
             <style jsx global>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
            <div className="max-w-4xl mx-auto p-8 print:p-0">
                <header className="flex justify-between items-start mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <h1 className="text-3xl font-extrabold text-primary">Ibarracudán</h1>
                        </div>
                        <p className="text-muted-foreground">San Diego, 2006</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-bold text-muted-foreground">NOTA DE ENTREGA</h2>
                        <p className="text-lg mt-1"># {getOrderIdSuffix(order.id)}</p>
                        <p className="text-muted-foreground mt-1">Fecha: {formatDate(order.created_at)}</p>
                    </div>
                </header>

                <div className="grid grid-cols-2 gap-10 mb-10">
                    <div>
                        <h3 className="text-lg font-semibold border-b pb-2 mb-3">Cliente</h3>
                        <p className="font-medium text-lg">{order.client_name}</p>
                        <p className="text-muted-foreground">{order.client_address}</p>
                        <p className="text-muted-foreground">{order.client_phone}</p>
                        <p className="text-muted-foreground">{order.client_id_number}</p>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold border-b pb-2 mb-3">Pago</h3>
                        <p className="font-medium text-lg capitalize">{order.payment_method || 'No especificado'}</p>
                    </div>
                </div>

                <div>
                    <div className="rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr className="border-b">
                                    <th className="text-left p-3 font-medium">Producto</th>
                                    <th className="text-center p-3 font-medium hidden sm:table-cell">Código</th>
                                    <th className="text-center p-3 font-medium">Cantidad</th>
                                    <th className="text-right p-3 font-medium">Precio Unit.</th>
                                    <th className="text-right p-3 font-medium">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items_pedido.map(item => (
                                    <tr key={item.id} className="border-b">
                                        <td className="p-3">
                                            <div className="font-medium">{item.productos.code}</div>
                                            <div className="text-muted-foreground text-xs">{item.productos.tipo}</div>
                                        </td>
                                        <td className="p-3 text-center hidden sm:table-cell">{item.productos.code}</td>
                                        <td className="p-3 text-center">{item.quantity}</td>
                                        <td className="p-3 text-right">{formatCurrency(item.sell_price)}</td>
                                        <td className="p-3 text-right font-medium">{formatCurrency(item.quantity * item.sell_price)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end mt-6">
                        <div className="w-full max-w-xs">
                            <div className="flex justify-between items-center py-2">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium">{formatCurrency(order.total || 0)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center py-3 text-xl font-bold text-primary">
                                <span>TOTAL</span>
                                <span>{formatCurrency(order.total || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="mt-20 text-center text-muted-foreground text-xs">
                    <p>Gracias por su compra.</p>
                </footer>
                
                <div className="mt-8 text-center no-print">
                    <Button onClick={() => window.print()}>
                        Imprimir o Guardar como PDF
                    </Button>
                </div>
            </div>
        </div>
    );
}
