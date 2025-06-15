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
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <div className="space-y-8 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-500">Manage Account</h2>
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          </div>
        </div>
        <div className="rounded-xl shadow p-8 sm:p-10" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e0f7fa 100%)' }}>
          <div className="flex justify-end items-center mb-6">
            <a
              href="/dashboard"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Skip for now →
            </a>
          </div>
          <p className="mb-6 text-sm text-gray-500 font-medium">Update your contact information.</p>
          <ProfileForm />
        </div>
      </div>
    </div>
  );
}