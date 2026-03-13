import { auth } from "@/auth";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-2xl w-full p-4">
        {children}
      </div>
    </div>
  );
}