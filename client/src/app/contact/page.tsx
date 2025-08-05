"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggler from "@/components/ThemeToggler";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1/';

export default function ContactPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  React.useEffect(() => {
    const token = (typeof window !== 'undefined') && (localStorage.getItem('token') || sessionStorage.getItem('token'));
    const user = (typeof window !== 'undefined') && (localStorage.getItem('user') || sessionStorage.getItem('user'));
    if (!token || !user) {
      router.replace('/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    if (!subject || !message) {
      setError("Please fill in both fields.");
      return;
    }
    setLoading(true);
    try {
      // Get the authentication token
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError("Authentication required. Please log in again.");
        router.replace('/login');
        return;
      }

      const res = await fetch(`${API_URL}contact`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || "Your message has been sent! We'll get back to you soon.");
        setSubject("");
        setMessage("");
      } else {
        setError(data.error || "Failed to send message.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white dark:from-zinc-900 dark:to-zinc-800 p-4">
      <div className="fixed top-4 right-6 z-50">
        <ThemeToggler />
      </div>
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-lg shadow-md p-8 mt-4 mb-12">
        <h1 className="text-3xl font-bold mb-4 text-blue-700 dark:text-blue-300 text-center">Contact Us</h1>
        <p className="mb-6 text-zinc-700 dark:text-zinc-200 text-center">
          Have a question, suggestion, or issue? Fill out the form below and our team will get back to you as soon as possible.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-1 font-medium">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Subject"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
              required
              placeholder="Type your message here..."
            />
          </div>
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          {success && <div className="text-green-600 text-sm text-center">{success}</div>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
} 