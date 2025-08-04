class AccessibilityService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPlaying = false;
  private isPaused = false;
  private voices: SpeechSynthesisVoice[] = [];
  private isBrowser = typeof window !== 'undefined';

  constructor() {
    if (this.isBrowser) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      
      // Listen for voices changed event
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices(): void {
    if (this.synth) {
      this.voices = this.synth.getVoices();
    }
  }

  // Get available voices
  public getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  // Read article content aloud
  public readArticle(
    title: string, 
    content: string, 
    options: {
      rate?: number;
      pitch?: number;
      volume?: number;
      voice?: string;
    } = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isBrowser || !this.synth) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      // Stop any current speech
      this.stop();

      // Prepare text for reading
      const textToRead = this.prepareTextForSpeech(title, content);
      
      if (!textToRead.trim()) {
        reject(new Error('No content to read'));
        return;
      }

      this.currentUtterance = new SpeechSynthesisUtterance(textToRead);
      
      // Set voice options
      this.currentUtterance.rate = options.rate || 0.9;
      this.currentUtterance.pitch = options.pitch || 1;
      this.currentUtterance.volume = options.volume || 0.8;
      
      // Set voice if specified
      if (options.voice) {
        const selectedVoice = this.voices.find(v => v.name === options.voice);
        if (selectedVoice) {
          this.currentUtterance.voice = selectedVoice;
        }
      }

      // Event handlers
      this.currentUtterance.onstart = () => {
        this.isPlaying = true;
        this.isPaused = false;
        this.dispatchEvent('tts-start');
      };

      this.currentUtterance.onend = () => {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentUtterance = null;
        this.dispatchEvent('tts-end');
        resolve();
      };

      this.currentUtterance.onerror = (event) => {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentUtterance = null;
        this.dispatchEvent('tts-error', { error: event.error });
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.currentUtterance.onpause = () => {
        this.isPaused = true;
        this.dispatchEvent('tts-pause');
      };

      this.currentUtterance.onresume = () => {
        this.isPaused = false;
        this.dispatchEvent('tts-resume');
      };

      // Start speaking
      if (this.synth) {
        this.synth.speak(this.currentUtterance);
      }
    });
  }

  // Prepare text for natural speech
  private prepareTextForSpeech(title: string, content: string): string {
    let text = `Article title: ${title}. `;
    
    // Clean content for better speech
    const cleanContent = content
      .replace(/\[.*?\]/g, '') // Remove brackets
      .replace(/\(.*?\)/g, '') // Remove parentheses content
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Add pauses between sentences
      .trim();

    text += `Article content: ${cleanContent}`;
    
    return text;
  }

  // Control playback
  public pause(): void {
    if (this.isPlaying && !this.isPaused && this.synth) {
      this.synth.pause();
    }
  }

  public resume(): void {
    if (this.isPlaying && this.isPaused && this.synth) {
      this.synth.resume();
    }
  }

  public stop(): void {
    if (this.isPlaying && this.synth) {
      this.synth.cancel();
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
      this.dispatchEvent('tts-stop');
    }
  }

  // Get playback status
  public getStatus(): {
    isPlaying: boolean;
    isPaused: boolean;
    isSupported: boolean;
  } {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      isSupported: this.isBrowser && 'speechSynthesis' in window
    };
  }

  // Voice commands support
  public startVoiceRecognition(onCommand: (command: string) => void): void {
    if (!this.isBrowser || (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window))) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      onCommand(command);
    };

    recognition.start();
  }

  // High contrast mode
  public toggleHighContrast(): void {
    if (this.isBrowser) {
      document.documentElement.classList.toggle('high-contrast');
      this.dispatchEvent('contrast-change');
    }
  }

  // Font size adjustment
  public adjustFontSize(increase: boolean): void {
    if (!this.isBrowser) return;
    
    const root = document.documentElement;
    const currentSize = parseFloat(getComputedStyle(root).fontSize);
    const newSize = increase ? currentSize * 1.1 : currentSize * 0.9;
    
    // Limit font size between 12px and 24px
    const clampedSize = Math.max(12, Math.min(24, newSize));
    root.style.fontSize = `${clampedSize}px`;
    
    this.dispatchEvent('font-size-change', { size: clampedSize });
  }

  // Focus management for keyboard navigation
  public manageFocus(element: HTMLElement): void {
    if (this.isBrowser && element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Custom event dispatcher
  private dispatchEvent(eventName: string, detail?: any): void {
    if (this.isBrowser) {
      const event = new CustomEvent(`accessibility-${eventName}`, { detail });
      document.dispatchEvent(event);
    }
  }

  // Reading preferences
  public saveReadingPreferences(preferences: {
    rate: number;
    pitch: number;
    volume: number;
    voice: string;
    highContrast: boolean;
    fontSize: number;
  }): void {
    if (this.isBrowser) {
      localStorage.setItem('accessibility-preferences', JSON.stringify(preferences));
    }
  }

  public loadReadingPreferences(): any {
    if (!this.isBrowser) {
      return {
        rate: 0.9,
        pitch: 1,
        volume: 0.8,
        voice: '',
        highContrast: false,
        fontSize: 16
      };
    }
    
    const stored = localStorage.getItem('accessibility-preferences');
    return stored ? JSON.parse(stored) : {
      rate: 0.9,
      pitch: 1,
      volume: 0.8,
      voice: '',
      highContrast: false,
      fontSize: 16
    };
  }
}

// Export singleton instance
export const accessibilityService = new AccessibilityService();
export default accessibilityService;
