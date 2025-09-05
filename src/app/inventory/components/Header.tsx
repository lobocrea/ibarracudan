'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/auth';
import { LogOut, Package, ShoppingCart } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type HeaderProps = {
  user: string;
};

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">FlujoDeInventario</h1>
        </div>
        <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
          <Link href="/inventory" className={cn("transition-colors hover:text-foreground", pathname === '/inventory' ? 'text-foreground' : 'text-muted-foreground')}>
              Inventario
          </Link>
          <Link href="/orders" className={cn("transition-colors hover:text-foreground", pathname === '/orders' ? 'text-foreground' : 'text-muted-foreground')}>
              Pedidos
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="md:hidden">
            <ShoppingCart className="h-5 w-5" />
            <span className="sr-only">Pedidos</span>
        </Button>
         <Button variant="outline" size="icon" className="md:hidden">
            <Package className="h-5 w-5" />
            <span className="sr-only">Inventario</span>
        </Button>
        <span className="text-sm text-muted-foreground hidden md:inline">
          Bienvenido, <span className="font-semibold capitalize">{user}</span>
        </span>
        <form action={logout}>
          <Button variant="outline" size="icon" type="submit">
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Cerrar sesión</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
