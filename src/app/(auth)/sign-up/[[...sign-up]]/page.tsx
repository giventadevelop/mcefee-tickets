import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex flex-col items-center justify-center flex-1 py-2">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-center text-gray-900">Create Account</h1>
      </div>
      <SignUp redirectUrl="/" afterSignUpUrl="/" />
    </main>
  );
}