'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { UserProfileDTO } from '@/types';
import ProfileForm from '@/components/ProfileForm';
import { ProfileReconciliationTrigger } from '@/components/ProfileReconciliationTrigger';
import Image from 'next/image';

/**
 * Client-side profile page wrapper that shows loading state
 * while fetching profile data from the server
 */
export default function ProfilePageWithLoading() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchProfile();
    }
  }, [isLoaded, user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Call the server action through an API endpoint
      const response = await fetch('/api/profile/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (!isLoaded || loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account information and preferences.</p>
        </div>

        {/* Loading State with Image */}
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative w-32 h-32 mb-6">
            <Image
              src="/images/user_profile_loading.webp"
              alt="Loading profile..."
              fill
              className="object-contain animate-pulse"
              priority
            />
          </div>
          <p className="text-gray-600 text-lg font-medium">Loading your profile...</p>
          <div className="mt-4 flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account information and preferences.</p>
        </div>

        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-red-600 text-lg font-medium mb-4">{error}</div>
          <button
            onClick={fetchProfile}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show profile form
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-2">Manage your account information and preferences.</p>
      </div>

      {/* Profile Reconciliation Trigger Component */}
      <ProfileReconciliationTrigger />

      <ProfileForm initialProfile={profile} />
    </div>
  );
}