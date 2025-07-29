'use client'

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '@/lib/validations';
import { AuthResponse } from '@/types';
import ThemeToggler from '@/components/ThemeToggler';
import { useApi } from '@/hooks/useApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1/';

const loginUser = async (data: LoginFormData): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Login failed');
  }
  
  return response.json();
};

const LoginPage = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const router = useRouter();
  const { loading, error, execute } = useApi(loginUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    const result = await execute(data);
    if (result) {
      // Store auth data
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      sessionStorage.setItem('token', result.token);
      sessionStorage.setItem('user', JSON.stringify(result.user));
      
      router.replace('/articles');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 relative overflow-hidden">
      <div className="fixed top-4 right-6 z-50">
        <ThemeToggler />
      </div>
      {/* News-themed background SVG */}
      <img
        src="/globe.svg"
        alt="News Globe Background"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60vw',
          maxWidth: 600,
          minWidth: 320,
          opacity: 0.10,
          filter: 'blur(2px)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <Card className="w-full max-w-md p-8 shadow-lg border-none bg-white dark:bg-gray-900 dark:text-gray-100 relative z-10">
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-700 dark:text-blue-300">Welcome Back</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Label htmlFor="identifier" className="block mb-1 text-gray-700 dark:text-gray-200">Username / Email</Label>
            <Input
              id="identifier"
              type="text"
              {...register('identifier')}
              placeholder="Enter your username or email"
              className="focus-visible:ring-blue-500"
            />
            {errors.identifier && (
              <p className="text-red-600 text-sm mt-1">{errors.identifier.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="password" className="block mb-1 text-gray-700 dark:text-gray-200">Password</Label>
            <div style={{ position: 'relative' }}>
              <Input
                id="password"
                type={passwordVisible ? 'text' : 'password'}
                {...register('password')}
                placeholder="Enter your password"
                className="focus-visible:ring-blue-500 pr-10"
              />
              <button
                type="button"
                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                onClick={() => setPasswordVisible(v => !v)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <div className="mt-4 text-right">
          <button
            type="button"
            className="text-blue-600 hover:underline text-sm font-medium dark:text-blue-400"
            onClick={() => router.push('/forgot-password')}
          >
            Forgot Password?
          </button>
        </div>
        <p className="mt-6 text-center text-gray-600 dark:text-gray-300">
          Don&apos;t have an account?{' '}
          <a href="/signup" className="text-blue-600 hover:underline font-medium">Sign up</a>
        </p>
      </Card>
    </div>
  );
};

export default LoginPage; 