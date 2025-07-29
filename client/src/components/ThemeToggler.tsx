"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggler() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // On mount, check localStorage or system preference
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      style={{
        padding: '0.5rem',
        borderRadius: '50%',
        background: 'white',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        marginRight: 12,
        transition: 'background 0.2s',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5" style={{ color: '#fbbf24' }} />
      ) : (
        <Moon className="w-5 h-5" style={{ color: '#334155' }} />
      )}
    </button>
  );
} 