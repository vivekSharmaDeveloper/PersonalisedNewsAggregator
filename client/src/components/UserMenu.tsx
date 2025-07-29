import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User as UserIcon } from 'lucide-react';
import { useTheme } from "@/lib/useTheme";

// Define options at the top
const INTEREST_OPTIONS = [
    'Technology', 'Science', 'Finance', 'Environment', 'Politics', 'Sports', 'Health', 'Entertainment', 'Business', 'World', 'General'
];
const SOURCE_OPTIONS = [
    'BBC', 'Reuters', 'The New York Times', 'CNN', 'Al Jazeera', 'Fox News', 'The Guardian', 'Bloomberg', 'NDTV', 'Times of India'
];

// Add a simple toast component
function Toast({ message, onClose }: { message: string, onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, background: '#22c55e', color: '#fff', padding: '1rem 2rem', borderRadius: 8, fontWeight: 600, fontSize: 16, zIndex: 99999, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
      {message}
    </div>
  );
}

const UserMenu: React.FC = () => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [user, setUser] = useState<{ fullName?: string; username?: string; avatar?: string } | null>(null);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const theme = useTheme();
    const isDark = theme === 'dark';
    const [toast, setToast] = useState<string | null>(null);

    // Preferences state (interests, sources)
    const [selectedInterests, setSelectedInterests] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (userData) {
                try {
                    const userObj = JSON.parse(userData);
                    return userObj.interests || ['Technology', 'Sports'];
                } catch {}
            }
        }
        return ['Technology', 'Sports'];
    });
    const [selectedSources, setSelectedSources] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (userData) {
                try {
                    const userObj = JSON.parse(userData);
                    return userObj.sources || ['BBC', 'Reuters'];
                } catch {}
            }
        }
        return ['BBC', 'Reuters'];
    });
    function toggleInterest(interest: string) {
        setSelectedInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]);
    }
    function toggleSource(source: string) {
        setSelectedSources(prev => prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]);
    }
    function saveProfileModal() {
        // Save preferences to user in localStorage/sessionStorage
        let userData = localStorage.getItem('user') || sessionStorage.getItem('user');
        let userObj = userData ? JSON.parse(userData) : {};
        userObj.interests = selectedInterests;
        userObj.sources = selectedSources;
        localStorage.setItem('user', JSON.stringify(userObj));
        sessionStorage.setItem('user', JSON.stringify(userObj));
        // Dispatch custom event for same-tab updates
        window.dispatchEvent(new Event('user-preferences-updated'));
        setShowProfileModal(false);
        setToast('Preferences updated successfully!');
    }

    useEffect(() => {
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
        setMounted(true);
    }, []);

    useEffect(() => {
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

    // Helper to get initials from full name or username
    function getInitials(name?: string) {
        if (!name) return '';
        const words = name.trim().split(' ');
        if (words.length === 1) return words[0][0].toUpperCase();
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    // Deterministic hash to get a number from a string
    function hashString(str: string) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    }
    // Generate a color from a string
    function stringToColor(str: string, offset = 0) {
        const hash = hashString(str + offset);
        const r = (hash >> 16) & 0xff;
        const g = (hash >> 8) & 0xff;
        const b = hash & 0xff;
        return `rgb(${Math.abs(r)},${Math.abs(g)},${Math.abs(b)})`;
    }
    const displayName = user?.fullName || user?.username || 'U';
    const initials = getInitials(displayName);
    const bgColor = stringToColor(displayName, 1);
    const textColor = stringToColor(displayName, 2);
    const avatar = user?.avatar;

    if (!mounted) {
        // Render nothing or a skeleton to avoid hydration mismatch
        return <div style={{ minWidth: 120, minHeight: 32 }} />;
    }

    return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
                id="user-dropdown-trigger"
                onClick={() => setDropdownOpen((v) => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                aria-label="User menu"
            >
                {avatar ? (
                    <img
                        src={avatar}
                        alt="Avatar"
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            background: '#e5e7eb',
                            display: 'block',
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: bgColor,
                            color: textColor || '#fff', // fallback to white
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: 24,
                            userSelect: 'none',
                            overflow: 'hidden',
                            letterSpacing: 1,
                        }}
                    >
                        <span style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'center',
                            lineHeight: '44px',
                            fontFamily: 'inherit',
                            fontWeight: 900,
                            fontSize: 24,
                            color: textColor || '#fff',
                            textShadow: 'none',
                        }}>{initials}</span>
                    </div>
                )}
            </button>
            {dropdownOpen && (
                <div
                    id="user-dropdown-menu"
                    style={{
                        position: 'absolute',
                        top: 40,
                        right: 0,
                        background: isDark ? '#18181b' : '#fff',
                        border: `1px solid ${isDark ? '#333' : '#e5e7eb'}`,
                        borderRadius: 8,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                        minWidth: 180,
                        zIndex: 100,
                        padding: '0.5rem 0',
                    }}
                >
                    <div style={{ padding: '0.5rem 1rem', fontWeight: 600, color: '#0369a1', borderBottom: `1px solid ${isDark ? '#333' : '#e5e7eb'}` }}>
                        Hi, {user?.fullName || user?.username || 'User'}
                    </div>
                    <button style={{ width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#fff' : '#222', fontSize: 15, transition: 'background 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.background = isDark ? '#23232a' : '#f3f3f6'}
                        onMouseOut={e => e.currentTarget.style.background = 'none'}
                        onClick={openProfileModal}>
                        Profile
                    </button>
                    <button style={{ width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#fff' : '#222', fontSize: 15, transition: 'background 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.background = isDark ? '#23232a' : '#f3f3f6'}
                        onMouseOut={e => e.currentTarget.style.background = 'none'}
                        onClick={goToAccountInfo}>
                        My Account
                    </button>
                    <button style={{ width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#fff' : '#222', fontSize: 15, transition: 'background 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.background = isDark ? '#23232a' : '#f3f3f6'}
                        onMouseOut={e => e.currentTarget.style.background = 'none'}
                        onClick={() => { setDropdownOpen(false); router.push('/contact'); }}>
                        Contact Us
                    </button>
                    <button style={{ width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', fontWeight: 600, fontSize: 15, transition: 'background 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.background = isDark ? '#23232a' : '#f3f3f6'}
                        onMouseOut={e => e.currentTarget.style.background = 'none'}
                        onClick={handleLogout}>
                        Logout
                    </button>
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
                            minWidth: 340,
                            textAlign: 'left',
                            color: isDark ? '#fff' : '#222',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Preferences</div>
                        <div style={{ marginBottom: 18 }}>
                            <div style={{ fontWeight: 500, marginBottom: 6 }}>Interests:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {INTEREST_OPTIONS.map(option => (
                                    <label key={option} style={{ display: 'flex', alignItems: 'center', gap: 6, background: selectedInterests.includes(option) ? '#0070f3' : (isDark ? '#23232a' : '#f3f3f6'), color: selectedInterests.includes(option) ? '#fff' : (isDark ? '#fff' : '#222'), borderRadius: 6, padding: '0.3rem 0.8rem', cursor: 'pointer', fontWeight: 500 }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedInterests.includes(option)}
                                            onChange={() => toggleInterest(option)}
                                            style={{ accentColor: '#0070f3', marginRight: 4 }}
                                        />
                                        {option}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ fontWeight: 500, marginBottom: 6 }}>Subscribed Sources:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {SOURCE_OPTIONS.map(option => (
                                    <label key={option} style={{ display: 'flex', alignItems: 'center', gap: 6, background: selectedSources.includes(option) ? '#0070f3' : (isDark ? '#23232a' : '#f3f3f6'), color: selectedSources.includes(option) ? '#fff' : (isDark ? '#fff' : '#222'), borderRadius: 6, padding: '0.3rem 0.8rem', cursor: 'pointer', fontWeight: 500 }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedSources.includes(option)}
                                            onChange={() => toggleSource(option)}
                                            style={{ accentColor: '#0070f3', marginRight: 4 }}
                                        />
                                        {option}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button
                                onClick={saveProfileModal}
                                style={{
                                    padding: '0.5rem 1.5rem',
                                    borderRadius: 6,
                                    border: 'none',
                                    fontWeight: 600,
                                    fontSize: 16,
                                    background: '#0070f3',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                }}
                            >
                                Save
                            </button>
                            <button
                                onClick={closeProfileModal}
                                style={{
                                    padding: '0.5rem 1.5rem',
                                    borderRadius: 6,
                                    border: 'none',
                                    fontWeight: 600,
                                    fontSize: 16,
                                    background: '#e0e7ef',
                                    color: isDark ? '#fff' : '#222',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Logout Modal */}
            {showLogoutModal && (
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
                        if (e.target === e.currentTarget) setShowLogoutModal(false);
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
                        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Confirm Logout</div>
                        <div style={{ marginBottom: 18 }}>Are you sure you want to logout?</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
                            <button onClick={confirmLogout} style={{ padding: '0.5rem 1.5rem', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 16, background: '#d32f2f', color: '#fff', cursor: 'pointer' }}>Logout</button>
                            <button onClick={cancelLogout} style={{ padding: '0.5rem 1.5rem', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 16, background: '#e0e7ef', color: isDark ? '#fff' : '#222', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        </div>
    );
};

export default UserMenu; 