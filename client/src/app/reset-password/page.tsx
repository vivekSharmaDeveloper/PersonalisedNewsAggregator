"use client";
import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1/';

function ResetPasswordForm() {
  console.log('ResetPasswordPage mounted');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      console.log('Submitting reset password:', { token, newPassword });
      const res = await fetch(`${API_URL}users/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      console.log('Reset password response status:', res.status);
      const data = await res.json();
      console.log('Reset password response data:', data);
      if (res.ok) {
        setSuccess("Password reset successful! Redirecting to login...");
        setTimeout(() => router.replace("/login"), 2000);
      } else {
        setError(data.error || "Failed to reset password.");
      }
    } catch (err) {
      console.error('Reset password network error:', err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md p-8 shadow-lg border-none bg-white dark:bg-gray-900 dark:text-gray-100 rounded-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-700 dark:text-blue-300">Reset Password</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-1 font-medium">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
              placeholder="Confirm new password"
            />
          </div>
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          {success && <div className="text-green-600 text-sm text-center">{success}</div>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
