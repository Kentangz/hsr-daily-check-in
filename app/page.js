import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth';

export default function Home() {
  const session = verifySession();
  if (session.valid) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
  
  return null;
}
