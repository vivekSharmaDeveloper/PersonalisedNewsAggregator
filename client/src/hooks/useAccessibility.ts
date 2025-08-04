import { useState, useEffect, useCallback } from 'react';
import accessibilityService from '../services/accessibilityService';
import keyboardNavigationService from '../services/keyboardNavigationService';

interface TTSStatus {
  isPlaying: boolean;
  isPaused: boolean;
  isSupported: boolean;
}

interface AccessibilityPreferences {
  rate: number;
  pitch: number;
  volume: number;
  voice: string;
  highContrast: boolean;
  fontSize: number;
}

export const useAccessibility = () => {
  const [ttsStatus, setTtsStatus] = useState<TTSStatus>(() => 
    accessibilityService.getStatus()
  );
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() =>
    accessibilityService.loadReadingPreferences()
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load voices when component mounts
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = accessibilityService.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    
    // Sometimes voices load asynchronously
    const timer = setTimeout(loadVoices, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Listen to TTS events
  useEffect(() => {
    const handleTTSStart = () => setTtsStatus(prev => ({ ...prev, isPlaying: true, isPaused: false }));
    const handleTTSEnd = () => setTtsStatus(prev => ({ ...prev, isPlaying: false, isPaused: false }));
    const handleTTSPause = () => setTtsStatus(prev => ({ ...prev, isPaused: true }));
    const handleTTSResume = () => setTtsStatus(prev => ({ ...prev, isPaused: false }));
    const handleTTSStop = () => setTtsStatus(prev => ({ ...prev, isPlaying: false, isPaused: false }));

    document.addEventListener('accessibility-tts-start', handleTTSStart);
    document.addEventListener('accessibility-tts-end', handleTTSEnd);
    document.addEventListener('accessibility-tts-pause', handleTTSPause);
    document.addEventListener('accessibility-tts-resume', handleTTSResume);
    document.addEventListener('accessibility-tts-stop', handleTTSStop);

    return () => {
      document.removeEventListener('accessibility-tts-start', handleTTSStart);
      document.removeEventListener('accessibility-tts-end', handleTTSEnd);
      document.removeEventListener('accessibility-tts-pause', handleTTSPause);
      document.removeEventListener('accessibility-tts-resume', handleTTSResume);
      document.removeEventListener('accessibility-tts-stop', handleTTSStop);
    };
  }, []);

  // Apply preferences on load
  useEffect(() => {
    if (preferences.highContrast) {
      document.documentElement.classList.add('high-contrast');
    }
    if (preferences.fontSize !== 16) {
      document.documentElement.style.fontSize = `${preferences.fontSize}px`;
    }
  }, [preferences]);

  // Read article aloud
  const readArticle = useCallback(async (title: string, content: string) => {
    try {
      await accessibilityService.readArticle(title, content, {
        rate: preferences.rate,
        pitch: preferences.pitch,
        volume: preferences.volume,
        voice: preferences.voice
      });
    } catch (error) {
      console.error('Failed to read article:', error);
      throw error;
    }
  }, [preferences]);

  // Control playback
  const pauseReading = useCallback(() => {
    accessibilityService.pause();
  }, []);

  const resumeReading = useCallback(() => {
    accessibilityService.resume();
  }, []);

  const stopReading = useCallback(() => {
    accessibilityService.stop();
  }, []);

  // Toggle high contrast
  const toggleHighContrast = useCallback(() => {
    accessibilityService.toggleHighContrast();
    const newPrefs = { ...preferences, highContrast: !preferences.highContrast };
    setPreferences(newPrefs);
    accessibilityService.saveReadingPreferences(newPrefs);
  }, [preferences]);

  // Adjust font size
  const increaseFontSize = useCallback(() => {
    accessibilityService.adjustFontSize(true);
    const currentSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const newPrefs = { ...preferences, fontSize: currentSize };
    setPreferences(newPrefs);
    accessibilityService.saveReadingPreferences(newPrefs);
  }, [preferences]);

  const decreaseFontSize = useCallback(() => {
    accessibilityService.adjustFontSize(false);
    const currentSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const newPrefs = { ...preferences, fontSize: currentSize };
    setPreferences(newPrefs);
    accessibilityService.saveReadingPreferences(newPrefs);
  }, [preferences]);

  // Update TTS preferences
  const updateTTSSettings = useCallback((newSettings: Partial<AccessibilityPreferences>) => {
    const updatedPrefs = { ...preferences, ...newSettings };
    setPreferences(updatedPrefs);
    accessibilityService.saveReadingPreferences(updatedPrefs);
  }, [preferences]);

  // Voice commands
  const startVoiceCommands = useCallback((onCommand: (command: string, action: string) => void) => {
    accessibilityService.startVoiceRecognition((command) => {
      // Parse voice commands
      if (command.includes('read') || command.includes('play')) {
        onCommand(command, 'read');
      } else if (command.includes('stop')) {
        onCommand(command, 'stop');
      } else if (command.includes('pause')) {
        onCommand(command, 'pause');
      } else if (command.includes('resume') || command.includes('continue')) {
        onCommand(command, 'resume');
      } else if (command.includes('next')) {
        onCommand(command, 'next');
      } else if (command.includes('previous') || command.includes('back')) {
        onCommand(command, 'previous');
      } else if (command.includes('bookmark')) {
        onCommand(command, 'bookmark');
      } else if (command.includes('category')) {
        onCommand(command, 'category');
      } else {
        onCommand(command, 'unknown');
      }
    });
  }, []);

  // Keyboard navigation helpers
  const manageFocus = useCallback((element: HTMLElement) => {
    accessibilityService.manageFocus(element);
  }, []);

  return {
    // TTS functionality
    ttsStatus,
    readArticle,
    pauseReading,
    resumeReading,
    stopReading,
    
    // Accessibility preferences
    preferences,
    updateTTSSettings,
    toggleHighContrast,
    increaseFontSize,
    decreaseFontSize,
    
    // Voice commands
    startVoiceCommands,
    
    // Other utilities
    voices,
    manageFocus,
  };
};
