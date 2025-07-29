"use client"
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import ThemeToggler from '@/components/ThemeToggler';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1/';

const ForgotPasswordPage = () => {
  const [userInput, setUserInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [exists, setExists] = useState<boolean|null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate backend check for user existence
    const res = await fetch(`${API_URL}users/${encodeURIComponent(userInput)}/preferences`);
    setExists(res.status !== 404);
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 relative">
      <div className="fixed top-4 right-6 z-50">
        <ThemeToggler />
      </div>
      <Card className="w-full max-w-md p-8 shadow-xl border-none bg-white/90 dark:bg-zinc-900/90 dark:text-gray-100 rounded-xl">
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-700 dark:text-blue-300">Forgot Password</h2>
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="userInput" className="block mb-1 text-gray-700 dark:text-gray-200 font-semibold">Username / Email</Label>
              <Input
                id="userInput"
                type="text"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                required
                placeholder="Enter your username or email"
                className="focus-visible:ring-blue-500 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded shadow" disabled={loading}>
              {loading ? 'Checking...' : 'Submit'}
            </Button>
          </form>
        ) : (
          <div className="text-center mt-4">
            {exists ? (
              <>
                <div className="text-green-600 font-semibold mb-2">If an account with that username/email exists, you will receive a password reset email in your inbox.</div>
                <div className="text-gray-500 dark:text-gray-300">Please check your email for further instructions.</div>
              </>
            ) : (
              <div className="text-red-600 font-semibold">No account found with that username/email.</div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ForgotPasswordPage; 