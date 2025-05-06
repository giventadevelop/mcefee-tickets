import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { SideNav } from "@/components/side-nav";
import { Navbar } from "@/components/Navbar";

// Force Node.js runtime
export const runtime = 'nodejs';

interface AppLayoutProps {
  children: ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  try {
    // Initialize auth at runtime
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
      redirect("/sign-in");
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Top navbar */}
        <Navbar />

        <div className="flex min-h-[calc(100vh-4rem)]">
          {/* Sidebar */}
          <SideNav />

          {/* Main content */}
          <div className="flex-1">
            {/* Page content */}
            <div className="p-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in app layout:', error);
    redirect("/sign-in");
  }
}