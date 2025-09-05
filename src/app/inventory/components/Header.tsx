'use client';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/auth';
import { LogOut, Package } from 'lucide-react';

type HeaderProps = {
  user: string;
};

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">FlujoDeInventario</h1>
        </div>
      <div className="ml-auto flex items-center gap-4">
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
