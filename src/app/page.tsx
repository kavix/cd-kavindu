import { redirect } from 'next/navigation';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';

export default function Home() {
  redirect('/dashboard');
}
