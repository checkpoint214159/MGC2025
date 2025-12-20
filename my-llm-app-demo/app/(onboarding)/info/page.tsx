"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, SessionProvider } from "next-auth/react";

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <h2 className="text-xl font-semibold">
          {status === "loading" ? "Checking Session..." : "Analyzing Treatment Protocol..."}
        </h2>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const userData = {
      age: formData.get("age"),
      sex: formData.get("sex"),
      treatment: formData.get("treatment"),
    };

    try {
      // 1. Send data to your API route
      const response = await fetch("/api/generate-dashboard", {
        method: "POST",
        body: JSON.stringify(userData),
      });
    
      if (response.ok) {
        await update()
        router.push("/");
      }
    } catch (error) {
      console.error("Onboarding failed", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <h2 className="text-xl font-semibold">Analyzing Treatment Protocol...</h2>
        <p className="text-gray-500">Creating your personalized aftercare dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
      <h1 className="text-2xl font-bold mb-6">Patient Onboarding</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Age</label>
          <input name="age" type="number" required className="mt-1 w-full p-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sex</label>
          <select name="sex" className="mt-1 w-full p-2 border rounded-md">
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Treatment / Surgery</label>
          <input 
            name="treatment" 
            placeholder="e.g. Colorectal Surgery" 
            required 
            className="mt-1 w-full p-2 border rounded-md" 
          />
        </div>
        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Generate My Plan
        </button>
      </form>
    </div>
  );
}