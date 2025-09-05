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
        <h1 className="text-3xl font-bold text-center mb-2 text-foreground">InventoryFlow</h1>
        <p className="text-center text-muted-foreground mb-8">Welcome back. Please log in to your account.</p>
        <LoginForm />
        <p className="px-8 text-center text-sm text-muted-foreground mt-8">
          Use "cesar" or "edilberto" as username and "123456789" as password.
        </p>
      </div>
    </div>
  );
}
