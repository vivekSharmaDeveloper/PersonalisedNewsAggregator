import React, { useState, useEffect } from 'react';
import { 
  PersonStanding, 
  Volume2, 
  Eye, 
  Keyboard, 
  Plus, 
  Minus,
  Settings,
  ArrowUp
} from 'lucide-react';
import { useAccessibility } from '../hooks/useAccessibility';
import AccessibilityPanel from './AccessibilityPanel';

interface AccessibilityToolbarProps {
  article?: {
    title: string;
    content: string;
  };
  className?: string;
}

const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({ 
  article, 
  className = '' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const {
    ttsStatus,
    readArticle,
    stopReading,
    toggleHighContrast,
    increaseFontSize,
    decreaseFontSize,
    preferences
  } = useAccessibility();

  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (event: CustomEvent) => {
      switch (event.type) {
        case 'keyboard-accessibility-panel-toggle':
          setShowPanel(prev => !prev);
          break;
        case 'keyboard-font-increase':
          increaseFontSize();
          break;
        case 'keyboard-font-decrease':
          decreaseFontSize();
          break;
        case 'keyboard-read-article':
          if (article && !ttsStatus.isPlaying) {
            readArticle(article.title, article.content);
          } else if (ttsStatus.isPlaying) {
            stopReading();
          }
          break;
      }
    };

    document.addEventListener('keyboard-accessibility-panel-toggle', handleKeyboardShortcuts);
    document.addEventListener('keyboard-font-increase', handleKeyboardShortcuts);
    document.addEventListener('keyboard-font-decrease', handleKeyboardShortcuts);
    document.addEventListener('keyboard-read-article', handleKeyboardShortcuts);

    return () => {
      document.removeEventListener('keyboard-accessibility-panel-toggle', handleKeyboardShortcuts);
      document.removeEventListener('keyboard-font-increase', handleKeyboardShortcuts);
      document.removeEventListener('keyboard-font-decrease', handleKeyboardShortcuts);
      document.removeEventListener('keyboard-read-article', handleKeyboardShortcuts);
    };
  }, [article, ttsStatus, readArticle, stopReading, increaseFontSize, decreaseFontSize]);

  const handleReadArticle = async () => {
    if (!article) return;
    
    if (ttsStatus.isPlaying) {
      stopReading();
    } else {
      try {
        await readArticle(article.title, article.content);
      } catch (error) {
        console.error('Failed to read article:', error);
      }
    }
  };

  return (
    <>
      {/* Skip Links */}
      <div className="sr-only">
        <a 
          href="#main-content" 
          className="skip-link"
          onFocus={() => setIsExpanded(true)}
        >
          Skip to main content
        </a>
        <a 
          href="#navigation" 
          className="skip-link"
          onFocus={() => setIsExpanded(true)}
        >
          Skip to navigation
        </a>
      </div>

      {/* Back to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="back-to-top"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          backgroundColor: '#007acc',
          border: 'none',
          borderRadius: '20px',
          padding: '10px 20px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.3s ease',
        }}
        title="Back to top"
      >
        <ArrowUp size={20} />
        <span className="ml-2">Top</span>
      </button>

      {/* Accessibility Toolbar */}
      <div 
        className={`accessibility-toolbar ${className}`}
        role="toolbar"
        aria-label="Accessibility controls"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '2px solid #007acc',
          borderRadius: '50px',
          padding: isExpanded ? '12px' : '8px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.3s ease',
          maxWidth: isExpanded ? '320px' : '60px',
          overflow: 'hidden'
        }}
      >
        {/* Main Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="accessibility-toggle"
          aria-expanded={isExpanded}
          aria-controls="accessibility-controls"
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            borderRadius: '30px',
            cursor: 'pointer',
            color: '#007acc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
          title="Toggle accessibility controls (Alt+A)"
        >
          <PersonStanding size={24} />
          {isExpanded && <span className="ml-2">Accessibility</span>}
        </button>

        {/* Expanded Controls */}
        {isExpanded && (
          <div 
            id="accessibility-controls"
            className="accessibility-controls mt-3"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            {/* TTS Control */}
            <button
              onClick={handleReadArticle}
              disabled={!article}
              className="accessibility-control-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                background: ttsStatus.isPlaying ? '#ff6b6b' : '#007acc',
                color: 'white',
                cursor: article ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                opacity: article ? 1 : 0.5
              }}
              title={ttsStatus.isPlaying ? 'Stop reading (Alt+R)' : 'Read article aloud (Alt+R)'}
            >
              <Volume2 size={16} />
              <span className="ml-2">
                {ttsStatus.isPlaying ? 'Stop Reading' : 'Read Article'}
              </span>
              {ttsStatus.isPlaying && (
                <div 
                  className="tts-playing ml-2"
                  style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'white',
                    borderRadius: '50%'
                  }}
                />
              )}
            </button>

            {/* Font Size Controls */}
            <div 
              className="font-controls"
              style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
            >
              <button
                onClick={decreaseFontSize}
                className="accessibility-control-btn"
                style={{
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="Decrease font size (Ctrl+-)"
              >
                <Minus size={14} />
              </button>
              <span 
                style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  minWidth: '40px',
                  textAlign: 'center'
                }}
              >
                {Math.round(preferences.fontSize)}px
              </span>
              <button
                onClick={increaseFontSize}
                className="accessibility-control-btn"
                style={{
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="Increase font size (Ctrl++)"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* High Contrast Toggle */}
            <button
              onClick={toggleHighContrast}
              className="accessibility-control-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                background: preferences.highContrast ? '#333' : 'white',
                color: preferences.highContrast ? 'white' : '#333',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              title="Toggle high contrast mode"
            >
              <Eye size={16} />
              <span className="ml-2">
                {preferences.highContrast ? 'Disable' : 'Enable'} High Contrast
              </span>
            </button>

            {/* More Settings */}
            <button
              onClick={() => setShowPanel(true)}
              className="accessibility-control-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                background: 'white',
                color: '#333',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              title="Open accessibility settings panel"
            >
              <Settings size={16} />
              <span className="ml-2">More Settings</span>
            </button>

            {/* Keyboard Shortcut Hint */}
            <div 
              style={{
                fontSize: '11px',
                color: '#666',
                borderTop: '1px solid #eee',
                paddingTop: '8px',
                marginTop: '4px'
              }}
            >
              <div><strong>Shortcuts:</strong></div>
              <div>Alt+A: Toggle this panel</div>
              <div>Alt+R: Read article</div>
              <div>Ctrl+±: Font size</div>
              <div>Alt+M: Skip to content</div>
            </div>
          </div>
        )}
      </div>

      {/* Accessibility Panel */}
      <AccessibilityPanel
        article={article}
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
      />

      {/* Live Region for Announcements */}
      <div
        id="accessibility-announcements"
        aria-live="polite"
        aria-atomic="true"
        className="accessibility-announcement"
      />
    </>
  );
};

export default AccessibilityToolbar;
