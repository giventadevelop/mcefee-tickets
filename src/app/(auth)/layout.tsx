import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <span className="text-xl font-bold text-gray-900">TaskMngr</span>
            </Link>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}