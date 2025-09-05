import { LoginForm } from '@/app/components/LoginForm';
import { Package } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-primary text-primary-foreground rounded-full p-4">
            <Package className="h-10 w-10" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center mb-2 text-foreground">FlujoDeInventario</h1>
        <p className="text-center text-muted-foreground mb-8">Bienvenido de nuevo. Por favor, inicia sesión en tu cuenta.</p>
        <LoginForm />
        <p className="px-8 text-center text-sm text-muted-foreground mt-8">
          Usa "cesar" o "edilberto" como nombre de usuario y "123456789" como contraseña.
        </p>
      </div>
    </div>
  );
}
