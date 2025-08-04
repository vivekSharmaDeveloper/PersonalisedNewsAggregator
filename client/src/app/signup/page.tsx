'use client'

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import ThemeToggler from '@/components/ThemeToggler';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1/';

const SignupPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordReqs, setPasswordReqs] = useState({
    upper: false,
    lower: false,
    number: false,
    special: false,
    length: false,
  });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fullName, setFullName] = useState('');

  // Username uniqueness check
  useEffect(() => {
    if (!username) {
      setUsernameError('');
      setUsernameSuggestions([]);
      setCheckingUsername(false);
      return;
    }
    // Only check if username starts with a letter and is at least 3 chars
    if (!/^[a-zA-Z]/.test(username)) {
      setUsernameError('');
      setUsernameSuggestions([]);
      setCheckingUsername(false);
      return;
    }
    if (username.length < 3) {
      setUsernameError('');
      setUsernameSuggestions([]);
      setCheckingUsername(false);
      return;
    }
    setCheckingUsername(true);
    fetch(`${API_URL}users/check-username/${encodeURIComponent(username)}`)
      .then(res => res.json())
      .then(data => {
        if (data.available) {
          setUsernameError('');
          setUsernameSuggestions([]);
        } else {
          setUsernameError('Username is already taken.');
          const base = username.replace(/\d+$/, '');
          const suggestions = Array.from({ length: 3 }, (_, i) => base + Math.floor(Math.random() * 10000));
          setUsernameSuggestions(suggestions);
        }
      })
      .catch(() => {
        // Suppress all errors to avoid console clutter
        setUsernameError('');
        setUsernameSuggestions([]);
      })
      .finally(() => setCheckingUsername(false));
  }, [username]);

  // Password requirements and strength
  useEffect(() => {
    setPasswordReqs({
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      length: password.length >= 8,
    });
    let score = 0;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (password.length >= 8) score++;
    setPasswordStrength(score);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName || !username || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (usernameError) {
      return;
    }
    if (Object.values(passwordReqs).some(v => !v)) {
      setError('Password does not meet all requirements.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, username, email, password })
      });
      if (res.ok) {
        // Auto-login after signup
        const loginRes = await fetch(`${API_URL}users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: username, password })
        });
        if (loginRes.ok) {
          const data = await loginRes.json();
          // Store token and user info
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setShowSuccess(true);
          setTimeout(() => {
            // Redirect new users to onboarding, existing users to articles
            if (data.user.onboarded) {
              window.location.href = '/articles';
            } else {
              window.location.href = '/onboarding';
            }
          }, 1500);
        } else {
          setError('Signup succeeded but login failed. Please log in manually.');
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
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
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-700 dark:text-blue-300">Create Your Account</h2>
        {showSuccess && (
          <div className="mb-4 text-green-600 text-center font-semibold">Signup Successful!</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="fullName" className="block mb-1 text-gray-700 dark:text-gray-200">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              placeholder="Enter your full name"
              className="focus-visible:ring-blue-500"
            />
          </div>
          <div>
            <Label htmlFor="username" className="block mb-1 text-gray-700 dark:text-gray-200">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || /^[a-zA-Z]/.test(val)) {
                  setUsername(val);
                }
              }}
              required
              placeholder="Enter your username"
              className={`focus-visible:ring-blue-500 ${usernameError ? 'border-red-500' : ''}`}
            />
            {checkingUsername && !usernameError && <div className="text-xs text-gray-500 mt-1">Checking username...</div>}
            {usernameError && <div className="text-red-600 text-xs mt-1">{usernameError}</div>}
            {usernameSuggestions.length > 0 && !usernameError && (
              <div className="text-xs text-gray-600 mt-1">Try: {usernameSuggestions.map(s => <span key={s} className="bg-gray-200 rounded px-2 py-0.5 mx-1">{s}</span>)}</div>
            )}
          </div>
          <div>
            <Label htmlFor="email" className="block mb-1 text-gray-700 dark:text-gray-200">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="focus-visible:ring-blue-500"
            />
          </div>
          <div>
            <Label htmlFor="password" className="block mb-1 text-gray-700 dark:text-gray-200">Password</Label>
            <div style={{ position: 'relative' }}>
              <Input
                id="password"
                type={passwordVisible ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Create a password"
                className="focus-visible:ring-blue-500 pr-10"
              />
              <button
                type="button"
                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                onClick={() => setPasswordVisible(v => !v)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  zIndex: 2,
                }}
              >
                {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="w-full h-2 bg-gray-200 rounded">
                  <div
                    className={`h-2 rounded transition-all duration-300 ${
                      passwordStrength <= 2 ? 'bg-red-500 w-1/5' : passwordStrength === 3 ? 'bg-yellow-500 w-3/5' : passwordStrength === 4 ? 'bg-blue-500 w-4/5' : 'bg-green-500 w-full'
                    }`}
                  ></div>
                </div>
                <ul className="text-xs mt-2 space-y-1">
                  <li className={passwordReqs.upper ? 'text-green-600' : 'text-gray-500'}>• At least 1 uppercase letter</li>
                  <li className={passwordReqs.lower ? 'text-green-600' : 'text-gray-500'}>• At least 1 lowercase letter</li>
                  <li className={passwordReqs.number ? 'text-green-600' : 'text-gray-500'}>• At least 1 number</li>
                  <li className={passwordReqs.special ? 'text-green-600' : 'text-gray-500'}>• At least 1 special character</li>
                  <li className={passwordReqs.length ? 'text-green-600' : 'text-gray-500'}>• At least 8 characters long</li>
                </ul>
              </div>
            )}
          </div>
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded">Sign Up</Button>
        </form>
        <p className="mt-6 text-center text-gray-600 dark:text-gray-300">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline font-medium">Login</a>
        </p>
      </Card>
    </div>
  );
};

export default SignupPage; 