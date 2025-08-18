import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProfilePageWithLoading from '@/components/ProfilePageWithLoading';

export default async function ProfilePage() {
  const { userId } = auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Use client component that handles loading state
  return <ProfilePageWithLoading />;
}