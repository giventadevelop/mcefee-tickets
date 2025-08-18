"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { UserProfileDTO } from "@/types";
import { getTenantId } from '@/lib/env';

type UserProfileFormData = Omit<UserProfileDTO, 'createdAt' | 'updatedAt' | 'id'> & { id?: number; emailUnsubscribed?: boolean; isEmailSubscribed?: boolean };
const defaultFormData: UserProfileFormData = {
  userId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  notes: '',
  familyName: '',
  cityTown: '',
  district: '',
  educationalInstitution: '',
  profileImageUrl: '',
  emailUnsubscribed: false, // default to false
  isEmailSubscribed: true,  // default to true
};

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i}>
            <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
      <div>
        <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
      <div className="flex justify-end">
        <div className="h-10 w-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

interface ProfileFormProps {
  initialProfile?: UserProfileDTO | null;
}

export default function ProfileForm({ initialProfile }: ProfileFormProps) {
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!initialProfile);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserProfileFormData>(() => {
    if (initialProfile) {
      return {
        userId: initialProfile.userId || '',
        firstName: initialProfile.firstName || '',
        lastName: initialProfile.lastName || '',
        email: initialProfile.email || '',
        phone: initialProfile.phone || '',
        addressLine1: initialProfile.addressLine1 || '',
        addressLine2: initialProfile.addressLine2 || '',
        city: initialProfile.city || '',
        state: initialProfile.state || '',
        zipCode: initialProfile.zipCode || '',
        country: initialProfile.country || '',
        notes: initialProfile.notes || '',
        familyName: initialProfile.familyName || '',
        cityTown: initialProfile.cityTown || '',
        district: initialProfile.district || '',
        educationalInstitution: initialProfile.educationalInstitution || '',
        profileImageUrl: initialProfile.profileImageUrl || '',
        emailUnsubscribed: false, // Default value since field doesn't exist in DTO
        isEmailSubscribed: true,  // Default value since field doesn't exist in DTO
      };
    }
    return defaultFormData;
  });
  const [profileId, setProfileId] = useState<number | null>(initialProfile?.id || null);
  const [resubscribeLoading, setResubscribeLoading] = useState(false);
  const [resubscribeSuccess, setResubscribeSuccess] = useState(false);
  const [resubscribeError, setResubscribeError] = useState<string | null>(null);
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false);



  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      console.debug('No userId available, cannot submit form');
      return;
    }

    setLoading(true);
    setError(null);
    setProfileUpdateSuccess(false);

    try {
      // Import server actions
      const { updateUserProfileAction, createUserProfileAction } = await import('../app/profile/actions');

      let result = null;

      if (profileId) {
        // Update existing profile
        result = await updateUserProfileAction(profileId, formData);
      } else {
        // Create new profile
        result = await createUserProfileAction({
          ...formData,
          userId,
          userRole: 'MEMBER',
          userStatus: 'PENDING_APPROVAL',
        });
      }

      if (result) {
        setProfileId(result.id);
        setProfileUpdateSuccess(true);
        setError(null);
      } else {
        setError('Failed to save profile. Please try again.');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save profile data");
    } finally {
      setLoading(false);
    }
  };

  // Handler for resubscribe
  const handleResubscribe = async () => {
    setResubscribeLoading(true);
    setResubscribeError(null);
    setResubscribeSuccess(false);
    try {
      const email = formData.email;
      if (!email) {
        setResubscribeError('Missing email.');
        return;
      }

      // Import server action
      const { resubscribeEmailAction } = await import('../app/profile/actions');

      const success = await resubscribeEmailAction(email, 'token'); // Note: token should come from somewhere
      if (success) {
        setResubscribeSuccess(true);
        setResubscribeError(null);
        setFormData((prev) => ({ ...prev, emailUnsubscribed: false, isEmailSubscribed: true }));
      } else {
        setResubscribeError('Failed to resubscribe. Please try again.');
      }
    } catch (e) {
      setResubscribeError('Network error. Please try again.');
    } finally {
      setResubscribeLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto p-4">
      {/* Top action row: Skip and Resubscribe */}
      <div className="flex justify-between items-center mb-6">
        <a
          href="/"
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          Skip for now →
        </a>
        {(formData.emailUnsubscribed === true || formData.isEmailSubscribed === false) && !resubscribeSuccess && (
          <button
            type="button"
            onClick={handleResubscribe}
            disabled={resubscribeLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {resubscribeLoading ? "Resubscribing..." : "Resubscribe to Emails"}
          </button>
        )}
      </div>
      {profileUpdateSuccess && (
        <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4 flex items-center">
          <span>Your Profile is updated.</span>
        </div>
      )}
      {resubscribeSuccess && (
        <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4 flex items-center">
          <span>You are now subscribed to emails.</span>
        </div>
      )}
      {resubscribeError && (
        <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4 flex items-center">
          <span>{resubscribeError}</span>
        </div>
      )}

      <div className="border rounded-lg p-4 bg-gray-50 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone || ""}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
          </div>
        </div>
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="md:col-span-2">
            <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700">
              Address Line 1
            </label>
            <input
              type="text"
              id="addressLine1"
              name="addressLine1"
              value={formData.addressLine1 || ""}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
          </div>
        </div>
        <div className="md:col-span-3 grid grid-cols-1 gap-4 mt-4">
          <div>
            <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700">
              Address Line 2
            </label>
            <input
              type="text"
              id="addressLine2"
              name="addressLine2"
              value={formData.addressLine2 || ""}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
          </div>
        </div>
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city || ""}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700">
              State
            </label>
            <input
              type="text"
              id="state"
              name="state"
              value={formData.state || ""}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
          </div>
        </div>
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
              ZIP Code
            </label>
            <input
              type="text"
              id="zipCode"
              name="zipCode"
              value={formData.zipCode || ""}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country || ""}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
          </div>
        </div>
      </div>

      <div className="my-6">
        <div className="font-bold text-blue-700 mb-2 text-sm">[* The below fields are optional, your whereabouts in India]</div>
        <div className="border rounded-lg p-4 bg-blue-50">
          <h3 className="text-base font-semibold mb-4">India Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="familyName" className="block text-sm font-medium text-gray-700">
                Family Name
              </label>
              <input
                type="text"
                id="familyName"
                name="familyName"
                value={formData.familyName || ""}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                tabIndex={0}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <label htmlFor="district" className="block text-sm font-medium text-gray-700">
                District
              </label>
              <input
                type="text"
                id="district"
                name="district"
                value={formData.district || ""}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                tabIndex={0}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <label htmlFor="cityTown" className="block text-sm font-medium text-gray-700">
                City/Town
              </label>
              <input
                type="text"
                id="cityTown"
                name="cityTown"
                value={formData.cityTown || ""}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                tabIndex={0}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <label htmlFor="educationalInstitution" className="block text-sm font-medium text-gray-700">
                Educational Institution
              </label>
              <input
                type="text"
                id="educationalInstitution"
                name="educationalInstitution"
                value={formData.educationalInstitution || ""}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                tabIndex={0}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-gray-50 mb-6">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes || ""}
          onChange={handleChange}
          rows={4}
          className="mt-1 block w-full border border-gray-400 rounded-lg focus:border-blue-500 focus:ring-blue-500"
          tabIndex={0}
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className={`bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}