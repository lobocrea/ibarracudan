'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = createClient();

  const { error: signUpError } = await supabase.auth.signUp({ email, password });

  if (signUpError && signUpError.message.includes('already registered')) {
     const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if(signInError) {
        return 'Email o contraseña inválidos.';
      }
  } else if (signUpError) {
    return signUpError.message;
  }
  
  revalidatePath('/');
  redirect('/inventory');
}
