'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // For navigation if needed, or back button
import { ChevronLeft, User as UserIcon } from 'lucide-react';
import { useTheme } from "@/lib/useTheme";
import UserMenu from '@/components/UserMenu';
import ThemeToggler from '@/components/ThemeToggler';

interface SentimentResult {
    score?: number;
    label?: string;
    error?: string;
}

interface FakeNewsResult {
    label?: number;
    probability?: number;
    error?: string;
}

interface AnalysisResult {
    extractedText: string;
    sentiment?: SentimentResult;
    fakeNews?: FakeNewsResult;
    warning?: string;
    error?: string;
}

const CheckFakeStatusPage = () => {
    const [linkInput, setLinkInput] = useState<string>('');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const router = useRouter();
    const theme = useTheme();
    const isDark = theme === 'dark';
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    // Add user state for full name
    const [user, setUser] = useState<{ fullName?: string; username?: string } | null>(null);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    React.useEffect(() => {
        // Try to get user info from localStorage/sessionStorage
        let userData = null;
        if (typeof window !== 'undefined') {
            userData = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (userData) {
                try {
                    setUser(JSON.parse(userData));
                } catch {
                    setUser(null);
                }
            }
        }
    }, []);

    // Dropdown logic
    React.useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (!(e.target as HTMLElement).closest('#user-dropdown-trigger') && !(e.target as HTMLElement).closest('#user-dropdown-menu')) {
                setDropdownOpen(false);
            }
        }
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClick);
        } else {
            document.removeEventListener('mousedown', handleClick);
        }
        return () => document.removeEventListener('mousedown', handleClick);
    }, [dropdownOpen]);
    function deleteCookie(name: string) {
        document.cookie = name + '=; Max-Age=0; path=/; domain=' + window.location.hostname + ';';
    }
    function handleLogout() { setShowLogoutModal(true); }
    function confirmLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        deleteCookie('token');
        deleteCookie('auth');
        setDropdownOpen(false);
        setShowLogoutModal(false);
        router.push('/login');
    }
    function cancelLogout() { setShowLogoutModal(false); }
    function openProfileModal() { setDropdownOpen(false); setShowProfileModal(true); }
    function closeProfileModal() { setShowProfileModal(false); }
    function goToAccountInfo() { setDropdownOpen(false); router.push('/account-info'); }

    const API_CHECK_STATUS_URL = process.env.NEXT_PUBLIC_API_URL ?
                                 `${process.env.NEXT_PUBLIC_API_URL}check-fake-status` :
                                 'http://localhost:5000/api/v1/check-fake-status'; // Ensure this matches your backend route

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAnalysisResult(null);
        setError(null);

        try {
            let response;
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                response = await fetch(API_CHECK_STATUS_URL, {
                    method: 'POST',
                    body: formData,
                });
            } else {
                response = await fetch(API_CHECK_STATUS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ link: linkInput }),
            });
            }
            const data: AnalysisResult = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze input.');
            }
            setAnalysisResult(data);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during analysis.');
        } finally {
            setLoading(false);
        }
    };

    function getSentimentEmoji(score: number | undefined) {
        if (score === undefined || score === null) return { emoji: '', label: 'Unknown' };
        if (score >= 0.6) return { emoji: '😄😍', label: 'Highly Positive' };
        if (score >= 0.2) return { emoji: '😊🙂', label: 'Positive' };
        if (score > -0.2) return { emoji: '😐😶', label: 'Neutral' };
        if (score > -0.6) return { emoji: '🙁😟', label: 'Negative' };
        return { emoji: '😠😡😭', label: 'Highly Negative' };
    }

    return (
        <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1.5rem' }}>
            {/* Top bar with theme toggler and user icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '2rem', position: 'relative', gap: '12px' }}>
                <ThemeToggler />
                <UserMenu />
            </div>
            {/* Remove Back Button and Card styles, use normal format */}
            {(!mounted) ? (
                <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#333', fontWeight: 700, fontSize: 32 }}>Check Fake News Status</h1>
            ) : (
                <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', color: isDark ? '#fff' : '#333', fontWeight: 700, fontSize: 32 }}>Check Fake News Status</h1>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label htmlFor="news-link" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#555' }}>
                    Enter News Link, Image Link, or YouTube Video Link:
                </label>
                <input
                    id="news-link"
                    type="url"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="e.g., https://example.com/news, https://image.com/pic.jpg, https://youtube.com/watch?v=..."
                    style={{ padding: '0.8rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
                    disabled={!!file}
                />
                <div style={{ textAlign: 'center', color: '#888', fontSize: '0.95rem' }}>or</div>
                <label htmlFor="file-upload" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#555' }}>
                    Upload PDF, JPG, JPEG, or PNG file:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label htmlFor="file-upload" style={{
                        display: 'inline-block',
                        padding: '0.7rem 1.5rem',
                        background: '#0070f3',
                        color: '#fff',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1.05rem',
                        boxShadow: '0 2px 8px rgba(0,112,243,0.08)',
                        border: 'none',
                        transition: 'background 0.2s',
                        marginBottom: 0
                    }}>
                        Upload File
                        <input
                            id="file-upload"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={e => {
                                setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
                                if (e.target.files && e.target.files[0]) setLinkInput('');
                            }}
                            style={{ display: 'none' }}
                        />
                    </label>
                    {file && (
                        <div style={{ color: '#0070f3', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>Selected: {file.name}</span>
                            <button type="button" onClick={() => setFile(null)} style={{ color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>Remove</button>
                        </div>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={loading || (!linkInput.trim() && !file)}
                    style={{
                        padding: '0.9rem 1.5rem',
                        background: '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        transition: 'background 0.2s',
                        opacity: loading || (!linkInput.trim() && !file) ? 0.7 : 1,
                    }}
                >
                    {loading ? (file ? 'Analyzing File...' : 'Analyzing...') : (file ? 'Analyze File' : 'Analyze Link')}
                </button>
            </form>

            {error && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#ffeaea', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '4px' }}>
                    Error: {error}
                </div>
            )}

            {analysisResult && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: isDark ? '#18181b' : '#f9f9f9', border: `1px solid ${isDark ? '#333' : '#eee'}`, borderRadius: '8px', color: isDark ? '#fff' : '#222' }}>
                    <h2 style={{ marginBottom: '1rem', color: isDark ? '#fff' : '#333' }}>Analysis Results:</h2>
                    <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ color: isDark ? '#ddd' : '#555' }}>Extracted Text Preview:</strong>
                        <p style={{ background: isDark ? '#23232a' : '#eef', padding: '0.8rem', borderRadius: '4px', whiteSpace: 'pre-line', maxHeight: '200px', overflowY: 'auto', color: isDark ? '#fff' : '#222' }}>
                            {analysisResult.extractedText ? analysisResult.extractedText.substring(0, 500) + (analysisResult.extractedText.length > 500 ? '...' : '') : 'No text extracted.'}
                        </p>
                    </div>
                    {/* Sentiment Section */}
                        <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ color: isDark ? '#ddd' : '#555' }}>Sentiment:</strong>{' '}
                        {analysisResult.sentiment?.error ? (
                            <span style={{ color: '#d32f2f' }}>Error: {analysisResult.sentiment.error}</span>
                        ) : analysisResult.sentiment && analysisResult.sentiment.label ? (
                            <span style={{
                                background: '#e0e7ef',
                                color: '#0070f3',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontWeight: 600,
                                fontSize: 13,
                                marginLeft: 8
                            }}>
                                {analysisResult.sentiment.label} ({typeof analysisResult.sentiment.score === 'number' ? analysisResult.sentiment.score.toFixed(2) : 'N/A'})
                            </span>
                        ) : (
                            <span style={{ color: '#888' }}>No sentiment result.</span>
                        )}
                        </div>
                    {/* Fake News Section */}
                    <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ color: isDark ? '#ddd' : '#555' }}>Fake News Status:</strong>{' '}
                        {analysisResult.fakeNews?.error ? (
                            <span style={{ color: '#d32f2f' }}>Error: {analysisResult.fakeNews.error}</span>
                        ) : typeof analysisResult.fakeNews?.label !== 'undefined' ? (
                            <span style={{
                                background: analysisResult.fakeNews.label === 1 ? '#ffeaea' : '#eaffea',
                                color: analysisResult.fakeNews.label === 1 ? '#d32f2f' : '#388e3c',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontSize: '0.9em',
                                marginLeft: 8
                            }}>
                                {analysisResult.fakeNews.label === 1 ? 'FAKE NEWS' : 'REAL NEWS'}
                                {typeof analysisResult.fakeNews.probability === 'number' &&
                                    ` (${(analysisResult.fakeNews.probability * 100).toFixed(1)}% likely)`}
                            </span>
                        ) : (
                            <span style={{ color: '#888' }}>No fake news classification result.</span>
                        )}
                    </div>
                        </div>
                    )}
            {/* Profile Modal */}
            {showProfileModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.25)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onClick={e => {
                        if (e.target === e.currentTarget) setShowProfileModal(false);
                    }}
                >
                    <div
                        style={{
                            background: isDark ? '#18181b' : '#fff',
                            borderRadius: 12,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                            padding: '2rem 2.5rem',
                            minWidth: 320,
                            textAlign: 'center',
                            color: isDark ? '#fff' : '#222',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Profile</div>
                        <div style={{ marginBottom: 12 }}><b>Full Name:</b> {user?.fullName || 'N/A'}</div>
                        <div style={{ marginBottom: 12 }}><b>Username:</b> {user?.username || 'N/A'}</div>
                        <button onClick={closeProfileModal} style={{ marginTop: 18, background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, cursor: 'pointer' }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckFakeStatusPage;