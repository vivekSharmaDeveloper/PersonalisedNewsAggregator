"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ThemeToggler from "@/components/ThemeToggler";
import UserMenu from "@/components/UserMenu";

const INTEREST_OPTIONS = [
  "Technology", "Science", "Finance", "Environment", "Politics", "Sports", "Health", "Entertainment", "Business", "World", "General"
];
const SOURCE_OPTIONS = [
  "BBC", "Reuters", "The New York Times", "CNN", "Al Jazeera", "Fox News", "The Guardian", "Bloomberg", "NDTV", "Times of India"
];

const STEPS = ["Welcome", "Value", "Features", "HowItWorks", "Preferences"];

export default function OnboardingPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!token || !userStr) {
      router.replace("/login");
      return;
    }
    try {
      const userObj = JSON.parse(userStr);
      setUser(userObj);
      setSelectedInterests(userObj.interests || []);
      setSelectedSources(userObj.sources || []);
      if (userObj.onboarded) {
        router.replace("/articles");
        return;
      }
    } catch {}
    setAuthChecked(true);
  }, [router]);

  const handleNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));
  const handleSkip = () => router.replace("/articles");

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]);
  };
  const toggleSource = (source: string) => {
    setSelectedSources((prev) => prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "users/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ interests: selectedInterests, sources: selectedSources, onboarded: true })
      });
      if (res.ok) {
        // Update user in storage
        const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          userObj.interests = selectedInterests;
          userObj.sources = selectedSources;
          userObj.onboarded = true;
          localStorage.setItem("user", JSON.stringify(userObj));
          sessionStorage.setItem("user", JSON.stringify(userObj));
        }
        router.replace("/articles");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="flex items-center justify-end gap-3 p-4">
        <ThemeToggler />
        <UserMenu />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Progress Dots */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <span key={i} className={`w-3 h-3 rounded-full ${i === step ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}></span>
          ))}
        </div>
        {/* Step Content */}
        {step === 0 && (
          <div className="text-center max-w-xl">
            <h1 className="text-3xl font-bold mb-2">Welcome to Newsly!</h1>
            <div className="text-lg mb-4">Your personalized gateway to unbiased news.</div>
            <div className="text-blue-600 font-semibold mb-6">Stay informed. Stay empowered.</div>
          </div>
        )}
        {step === 1 && (
          <div className="text-center max-w-xl">
            <h2 className="text-2xl font-bold mb-4">Why Newsly?</h2>
            <ul className="text-lg space-y-2">
              <li>Tired of sifting through biased headlines?</li>
              <li>Get the full picture with AI-powered sentiment and fake news detection.</li>
              <li>Discover news tailored to your interests, free from misinformation.</li>
            </ul>
          </div>
        )}
        {step === 2 && (
          <div className="text-center max-w-xl">
            <h2 className="text-2xl font-bold mb-4">Key Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col items-center">
                <span className="text-3xl mb-2">🧠</span>
                <div className="font-semibold">Uncover Hidden Bias</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">See the emotional tone of any article.</div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl mb-2">🕵️‍♂️</span>
                <div className="font-semibold">Spot the Fakes</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">Our AI helps identify potentially misleading news.</div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl mb-2">✨</span>
                <div className="font-semibold">Your News, Your Way</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">Customize your feed and save articles you care about.</div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl mb-2">🔗</span>
                <div className="font-semibold">Analyze Any Content</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">Input links, files, or text for analysis.</div>
              </div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="text-center max-w-xl">
            <h2 className="text-2xl font-bold mb-4">How It Works</h2>
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌐</span>
                <span className="font-semibold">Ingest:</span>
                <span className="text-sm">We gather news from diverse sources.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                <span className="font-semibold">Analyze:</span>
                <span className="text-sm">Our AI processes content for sentiment and authenticity.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <span className="font-semibold">Personalize & Deliver:</span>
                <span className="text-sm">Get a clear, personalized, and trustworthy news feed.</span>
              </div>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="text-center max-w-xl">
            <h2 className="text-2xl font-bold mb-4">Personalize Your Feed</h2>
            <div className="mb-4">
              <div className="font-semibold mb-2">Select Your Interests:</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {INTEREST_OPTIONS.map(option => (
                  <button
                    key={option}
                    className={`px-3 py-1 rounded-full border ${selectedInterests.includes(option) ? 'bg-blue-600 text-white border-blue-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700'}`}
                    onClick={() => toggleInterest(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <div className="font-semibold mb-2">Preferred News Sources:</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {SOURCE_OPTIONS.map(option => (
                  <button
                    key={option}
                    className={`px-3 py-1 rounded-full border ${selectedSources.includes(option) ? 'bg-blue-600 text-white border-blue-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700'}`}
                    onClick={() => toggleSource(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Your preferences help us personalize your news feed. You can change them anytime in your profile.</div>
          </div>
        )}
        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-8 justify-center">
          {step > 0 && <button className="px-4 py-2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-semibold" onClick={handleBack}>Back</button>}
          {step < STEPS.length - 1 && <button className="px-4 py-2 rounded bg-blue-600 text-white font-semibold" onClick={handleNext}>Next</button>}
          {step === STEPS.length - 1 && <button className="px-4 py-2 rounded bg-blue-600 text-white font-semibold" onClick={handleFinish} disabled={loading}>{loading ? 'Saving...' : 'Finish'}</button>}
          <button className="px-4 py-2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold" onClick={handleSkip}>Skip</button>
        </div>
      </div>
      {/* Optional: Testimonial and Privacy */}
      <div className="text-center text-zinc-500 dark:text-zinc-400 text-sm py-4">
        <div className="italic mb-1">“I finally feel in control of my news feed!” – Alex, early user</div>
        <div>Your data is private and never sold. <a href="/privacy" className="underline">Privacy Policy</a></div>
      </div>
    </div>
  );
} 