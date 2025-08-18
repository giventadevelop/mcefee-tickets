import { SignInWithReconciliation } from "@/components/SignInWithReconciliation";

export default function SignInPage() {
  return (
    <main className="flex flex-col items-center justify-center flex-1 py-2">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-center text-gray-900">Welcome Back</h1>
        <p className="mt-2 text-center text-gray-600">Sign in to continue</p>
      </div>
      <SignInWithReconciliation />
    </main>
  );
}