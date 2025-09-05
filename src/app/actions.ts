'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    const validUsernames = ['cesar', 'edilberto'];
    const validPassword = '123456789';

    if (validUsernames.includes(username.toLowerCase()) && password === validPassword) {
      cookies().set('session', username, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // One week
        path: '/',
      });
      redirect('/inventory');
    } else {
      return 'Invalid username or password.';
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error(error);
    return 'Something went wrong. Please try again.';
  }
}
