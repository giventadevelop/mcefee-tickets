"use client";
import ProfileForm from "@/components/ProfileForm";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfilePage() {
  const { userId, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isSignedIn, router]);

  if (!isSignedIn) {
    return null; // or a loading spinner
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8">
      <div className="space-y-8 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-500">Manage Account</h2>
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              <p className="mt-1 text-sm text-gray-500">Update your personal details and contact information.</p>
            </div>
            <a
              href="/dashboard"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Skip for now →
            </a>
          </div>
          <ProfileForm />
        </div>
      </div>
    </div>
  );
}