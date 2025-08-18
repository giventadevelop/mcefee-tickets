import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import TestStripeClient from './TestStripeClient';

export default async function TestStripePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Stripe Transaction</h1>
          <TestStripeClient />
        </div>
      </div>
    </div>
  );
}