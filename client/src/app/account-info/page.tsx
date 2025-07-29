"use client";
import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/useTheme";
import ThemeToggler from '@/components/ThemeToggler';
import UserMenu from '@/components/UserMenu';

// Add a simple toast component
function Toast({ message, onClose, error }: { message: string, onClose: () => void, error?: boolean }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, background: error ? '#ef4444' : '#22c55e', color: '#fff', padding: '1rem 2rem', borderRadius: 8, fontWeight: 600, fontSize: 16, zIndex: 99999, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
      {message}
    </div>
  );
}

export default function AccountInfoPage() {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme === 'dark';
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    // Auth check on mount
    const token = (typeof window !== 'undefined') && (localStorage.getItem('token') || sessionStorage.getItem('token'));
    const user = (typeof window !== 'undefined') && (localStorage.getItem('user') || sessionStorage.getItem('user'));
    if (!token || !user) {
      router.replace('/login');
    } else {
      try {
        const userObj = JSON.parse(user);
        setUsername(userObj.username || '');
        setEmail(userObj.email || '');
        if (userObj.fullName && userObj.fullName.trim() !== '') {
          setFullName(userObj.fullName);
        } else {
          setFullName(userObj.username || '');
        }
        setProfilePic(userObj.avatar || null);
        // Set last login info if available
        if (userObj.lastLogin) setLastLogin(userObj.lastLogin);
        if (userObj.lastLoginLocation) setLastLoginLocation(userObj.lastLoginLocation);
      } catch {
        setUsername('');
        setEmail('');
        setFullName('');
        setProfilePic(null);
        setLastLogin(null);
        setLastLoginLocation(null);
      }
      setAuthChecked(true);
    }
  }, []);
  useEffect(() => { setMounted(true); }, []);
  // User data state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastError, setToastError] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [lastLoginLocation, setLastLoginLocation] = useState<string | null>(null);

  // Remove the old hardcoded recentLogin object
  // const recentLogin = {
  //   date: "2024-06-01 10:23 AM",
  //   location: "New York, USA",
  // };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1/';

  if (!authChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Loading...</div>
      </div>
    );
  }

  function handleProfilePicChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => setProfilePic(ev.target?.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  async function handleDeleteAccount() {
    setShowDeleteModal(true);
  }
  async function confirmDeleteAccount() {
    setShowDeleteModal(false);
    // Backend call for account deletion
    try {
      const res = await fetch(`/api/v1/users/${username}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Account deleted successfully.');
        router.push('/login');
      } else {
        alert('Failed to delete account.');
      }
    } catch (err) {
      alert('Error deleting account.');
    }
  }
  function cancelDeleteAccount() {
    setShowDeleteModal(false);
  }

  return (
    !mounted ? (
      <div style={{ minHeight: '100vh', width: '100vw', background: '#f9f9fa', color: '#222' }} />
    ) : (
      <div className="relative min-h-screen w-full bg-gradient-to-br from-blue-50 to-white dark:from-zinc-900 dark:to-zinc-800 flex flex-col">
        {/* Decorative background image */}
        <img src="/globe.svg" alt="Background" className="pointer-events-none select-none fixed bottom-0 right-0 w-64 opacity-10 z-0" />
        <div className="fixed top-4 right-6 z-50 flex items-center gap-4">
          <ThemeToggler />
          <UserMenu />
        </div>
        <div className="flex flex-col items-center justify-center flex-1 z-10">
          <div className="w-full max-w-2xl bg-white/90 dark:bg-zinc-900/90 rounded-xl shadow-lg p-8 mt-8 mb-12 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-3xl font-bold mb-8 text-blue-700 dark:text-blue-300 text-center">Account Information</h2>
            <div className="space-y-8">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div className="font-semibold text-zinc-700 dark:text-zinc-200 mb-1">Username</div>
                <div className="text-lg font-medium">{username}</div>
              </div>
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div className="font-semibold text-zinc-700 dark:text-zinc-200 mb-1">Email Address</div>
                <div className="text-lg font-medium">{email}</div>
              </div>
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div className="font-semibold text-zinc-700 dark:text-zinc-200 mb-1">Display Name</div>
                <div className="flex gap-3 items-center mt-2">
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" />
                  <button
                    onClick={() => {
                      let userData = localStorage.getItem('user') || sessionStorage.getItem('user');
                      let userObj = userData ? JSON.parse(userData) : {};
                      userObj.fullName = fullName;
                      userObj.username = username;
                      localStorage.setItem('user', JSON.stringify(userObj));
                      sessionStorage.setItem('user', JSON.stringify(userObj));
                      setToast('Display name updated successfully!');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-semibold transition"
                  >Save</button>
                </div>
              </div>
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div className="font-semibold text-zinc-700 dark:text-zinc-200 mb-1">Avatar</div>
                <div className="flex items-center gap-4 mt-2">
                  <img src={profilePic || "/globe.svg"} alt="Avatar" className="w-16 h-16 rounded-full object-cover bg-zinc-200 dark:bg-zinc-800" />
                  <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-semibold transition">Upload</button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async e => {
                    if (e.target.files && e.target.files[0]) {
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        setProfilePic(ev.target?.result as string);
                        try {
                          const res = await fetch(`${API_URL}users/${username}/avatar`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ avatar: ev.target?.result })
                          });
                          if (res.ok) {
                            let userData = localStorage.getItem('user') || sessionStorage.getItem('user');
                            let userObj = userData ? JSON.parse(userData) : {};
                            userObj.avatar = ev.target?.result;
                            localStorage.setItem('user', JSON.stringify(userObj));
                            sessionStorage.setItem('user', JSON.stringify(userObj));
                            setToast('Avatar updated successfully!');
                          } else {
                            setToast('Failed to update avatar.');
                            setToastError(true);
                          }
                        } catch {
                          setToast('Failed to update avatar.');
                          setToastError(true);
                        }
                      };
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }} />
                </div>
              </div>
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div className="font-semibold text-zinc-700 dark:text-zinc-200 mb-1">Reset Password</div>
                {!changePassword ? (
                  <button onClick={() => setChangePassword(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-semibold transition">Change Password</button>
                ) : (
                  <div className="mt-3 space-y-2">
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current Password" className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" required />
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" required />
                    <input type="password" value={confirmPassword} onChange={e => {
                      setConfirmPassword(e.target.value);
                      if (newPassword && e.target.value !== newPassword) {
                        setPasswordError('Password not match');
                      } else {
                        setPasswordError(null);
                      }
                    }} placeholder="Confirm New Password" className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" required />
                    {newPassword && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(newPassword) && (
                      <div className="text-red-500 text-sm mb-1">Password must be at least 8 characters and include 1 uppercase, 1 lowercase, 1 number, and 1 special character.</div>
                    )}
                    {passwordError && <div className="text-red-500 text-sm mb-1">{passwordError}</div>}
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={async () => {
                          setToast(null);
                          setToastError(false);
                          setPasswordError(null);
                          if (!currentPassword || !newPassword || !confirmPassword) {
                            setPasswordError('All fields are required');
                            return;
                          }
                          if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(newPassword)) {
                            setPasswordError('Password does not meet requirements');
                            return;
                          }
                          if (newPassword !== confirmPassword) {
                            setPasswordError('Password not match');
                            return;
                          }
                          try {
                            const res = await fetch(`${API_URL}users/${username}/change-password`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ currentPassword, newPassword }),
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setToast('Password reset successfully!');
                              setToastError(false);
                              setChangePassword(false);
                              setCurrentPassword('');
                              setNewPassword('');
                              setConfirmPassword('');
                            } else {
                              setToast(data.error || 'Failed to reset password.');
                              setToastError(true);
                            }
                          } catch {
                            setToast('Network error. Please try again.');
                            setToastError(true);
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-semibold transition"
                      >Save</button>
                      <button onClick={() => { setChangePassword(false); setPasswordError(null); }} className="bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded px-4 py-2 font-semibold transition">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="pb-2">
                <div className="font-semibold text-zinc-700 dark:text-zinc-200 mb-1">Recent Login Activity</div>
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  Last login: {lastLogin ? (() => {
                    const d = new Date(lastLogin);
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    let hour = d.getHours();
                    const min = String(d.getMinutes()).padStart(2, '0');
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    hour = hour % 12;
                    hour = hour ? hour : 12;
                    const hourStr = String(hour).padStart(2, '0');
                    return `${day}/${month}/${year}, ${hourStr}:${min} ${ampm}`;
                  })() : 'N/A'}
                  {lastLoginLocation && lastLoginLocation !== '::1' && lastLoginLocation !== '127.0.0.1' && lastLoginLocation.trim() !== '' && (
                    <span> (IP: {lastLoginLocation})</span>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-8">
                <button onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2 font-semibold transition">Delete Account</button>
              </div>
            </div>
          </div>
        </div>
        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.25)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}>
            <div style={{ background: isDark ? "#18181b" : "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", padding: "2rem 2.5rem", minWidth: 320, textAlign: "center", color: isDark ? "#fff" : "#222" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Are you sure you want to delete your account?</div>
              <div style={{ color: "#d32f2f", marginBottom: 18 }}>This action cannot be undone and requires your password.</div>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter your password"
                style={{ width: "100%", marginBottom: 12, padding: "0.5rem", borderRadius: 6, border: "1px solid #e5e7eb" }}
              />
              <div style={{ display: "flex", justifyContent: "center", gap: 18 }}>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`${API_URL}users/${username}/delete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: currentPassword }),
                      });
                      if (res.ok) {
                        localStorage.clear();
                        sessionStorage.clear();
                        router.replace('/login');
                      } else {
                        const data = await res.json();
                        setToast(data.error || 'Failed to delete account.');
                        setToastError(true);
                      }
                    } catch {
                      setToast('Network error. Please try again.');
                      setToastError(true);
                    }
                    setShowDeleteModal(false);
                  }}
                  style={{ background: "#d32f2f", color: "#fff", border: "none", borderRadius: 6, padding: "0.5rem 1.5rem", fontWeight: 600, fontSize: 16, cursor: "pointer" }}
                >Delete</button>
                <button onClick={cancelDeleteAccount} style={{ background: "#e0e7ef", color: isDark ? "#fff" : "#222", border: "none", borderRadius: 6, padding: "0.5rem 1.5rem", fontWeight: 600, fontSize: 16, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {toast && <Toast message={toast} onClose={() => setToast(null)} error={toastError} />}
      </div>
    )
  );
} 