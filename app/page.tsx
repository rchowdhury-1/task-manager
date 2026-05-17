import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LandingPage } from './_landing/LandingPage';

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasToken = cookieStore.has('pos-token');

  if (hasToken) {
    redirect('/today');
  }

  return <LandingPage />;
}
