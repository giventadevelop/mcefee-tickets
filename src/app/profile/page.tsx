import { auth } from "@clerk/nextjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { Metadata } from "next";

// Force Node.js runtime
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: "Profile - TaskMngr",
  description: "Update your profile information",
};

export default async function ProfilePage() {
  try {
    // Get headers early to avoid issues with dynamic usage
    const headersList = await headers();
    // Initialize auth at runtime
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
      redirect('/sign-in');
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

          {/* Profile Form Card */}
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
  } catch (error) {
    console.error('Error in profile page:', error);
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="bg-red-50 p-4 rounded-md">
          <h2 className="text-red-800">Error loading profile</h2>
          <p className="text-red-600">Please try again later</p>
        </div>
      </div>
    );
  }
}