"use client";
import React from "react";
import ThemeToggler from "@/components/ThemeToggler";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();
  React.useEffect(() => {
    const token = (typeof window !== 'undefined') && (localStorage.getItem('token') || sessionStorage.getItem('token'));
    const user = (typeof window !== 'undefined') && (localStorage.getItem('user') || sessionStorage.getItem('user'));
    if (!token || !user) {
      router.replace('/login');
    }
  }, [router]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white dark:from-zinc-900 dark:to-zinc-800 p-4">
      <div className="fixed top-4 right-6 z-50">
        <ThemeToggler />
      </div>
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg shadow-md p-8 mt-4 mb-12">
        <h1 className="text-3xl font-bold mb-4 text-blue-700 dark:text-blue-300 text-center">Privacy Policy</h1>
        <p className="mb-6 text-zinc-700 dark:text-zinc-200 text-center">
          Your privacy is important to us. We are committed to protecting your personal information and being transparent about how we use it.
        </p>
        <ul className="list-disc pl-6 space-y-3 text-zinc-700 dark:text-zinc-200">
          <li><strong>No Selling of Data:</strong> We never sell your personal data to third parties.</li>
          <li><strong>Minimal Data Collection:</strong> We only collect information necessary to provide you with personalized news and account features.</li>
          <li><strong>Secure Storage:</strong> Your data is stored securely and protected with industry-standard encryption.</li>
          <li><strong>Control:</strong> You can update or delete your account and preferences at any time from your profile.</li>
          <li><strong>Cookies:</strong> We use cookies only for authentication and improving your experience. No tracking cookies are used for advertising.</li>
          <li><strong>Transparency:</strong> If you have any questions about your data, contact us at <a href="mailto:support@newsly.com" className="underline text-blue-600 dark:text-blue-400">support@newsly.com</a>.</li>
        </ul>
        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400 text-center">
          This policy may be updated from time to time. Please check back for the latest version.
        </p>
      </div>
    </div>
  );
} 