import { auth } from "@clerk/nextjs";
import Link from "next/link";
import { UserRoleDisplay } from "@/components/UserRoleDisplay";

export default async function Page() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* TEMPORARY: Show user role if signed in */}
          {userId && <UserRoleDisplay />}
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Manage Your Tasks with Ease
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            TaskMngr helps you organize your work, increase productivity, and never miss a deadline again.
          </p>
          {!userId && (
            <Link
              href="/sign-up"
              className="bg-[#39E079] text-[#141414] px-8 py-3 rounded-lg font-medium text-base hover:bg-[#32c96d] transition-colors inline-block"
            >
              Get Started Free
            </Link>
          )}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Task Organization</h3>
            <p className="text-gray-600">
              Create, organize, and prioritize your tasks with our intuitive interface.
            </p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Team Collaboration</h3>
            <p className="text-gray-600">
              Share tasks, assign responsibilities, and track progress together.
            </p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Progress Tracking</h3>
            <p className="text-gray-600">
              Monitor your productivity and celebrate your accomplishments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}