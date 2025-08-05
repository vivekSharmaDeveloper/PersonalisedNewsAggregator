import React, { useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Square, 
  Plus, 
  Minus, 
  Eye, 
  Mic, 
  Settings,
  Headphones
} from 'lucide-react';
import { useAccessibility } from '../hooks/useAccessibility';

interface AccessibilityPanelProps {
  article?: {
    title: string;
    content: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({ 
  article, 
  isOpen, 
  onClose 
}) => {
  const {
    ttsStatus,
    readArticle,
    pauseReading,
    resumeReading,
    stopReading,
    preferences,
    updateTTSSettings,
    toggleHighContrast,
    increaseFontSize,
    decreaseFontSize,
    voices,
    startVoiceCommands
  } = useAccessibility();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleReadArticle = async () => {
    if (!article) return;
    
    try {
      await readArticle(article.title, article.content);
    } catch (error) {
      console.error('Failed to read article:', error);
    }
  };

  const handleVoiceCommands = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    startVoiceCommands((command, action) => {
      console.log('Voice command:', command, action);
      
      switch (action) {
        case 'read':
          if (article) handleReadArticle();
          break;
        case 'pause':
          pauseReading();
          break;
        case 'resume':
          resumeReading();
          break;
        case 'stop':
          stopReading();
          break;
        default:
          console.log('Unknown voice command:', command);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-600">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center">
            <Headphones className="mr-2 w-5 h-5" />
            Accessibility Controls
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            aria-label="Close accessibility panel"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Text-to-Speech Controls */}
          <div className="space-y-3">
            <h3 className="font-medium text-zinc-900 dark:text-white flex items-center">
              <Volume2 className="mr-2 w-4 h-4" />
              Text-to-Speech
            </h3>
            
            {!ttsStatus.isSupported && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                Text-to-speech is not supported in your browser
              </div>
            )}

            <div className="flex items-center space-x-2">
              {!ttsStatus.isPlaying ? (
                <button
                  onClick={handleReadArticle}
                  disabled={!article || !ttsStatus.isSupported}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  aria-label="Read article aloud"
                >
                  <Play className="mr-1 w-4 h-4" />
                  Read Article
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  {ttsStatus.isPaused ? (
                    <button
                      onClick={resumeReading}
                      className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      aria-label="Resume reading"
                    >
                      <Play className="mr-1 w-4 h-4" />
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={pauseReading}
                      className="flex items-center px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                      aria-label="Pause reading"
                    >
                      <Pause className="mr-1 w-4 h-4" />
                      Pause
                    </button>
                  )}
                  <button
                    onClick={stopReading}
                    className="flex items-center px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    aria-label="Stop reading"
                  >
                    <Square className="mr-1 w-4 h-4" />
                    Stop
                  </button>
                </div>
              )}
            </div>

            {/* Status indicator */}
            {ttsStatus.isPlaying && (
              <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center">
                <div className="animate-pulse mr-2 w-2 h-2 bg-blue-600 rounded-full"></div>
                {ttsStatus.isPaused ? 'Reading paused...' : 'Reading article...'}
              </div>
            )}
          </div>

          {/* Voice Commands */}
          <div className="space-y-3">
            <h3 className="font-medium text-zinc-900 dark:text-white flex items-center">
              <Mic className="mr-2 w-4 h-4" />
              Voice Commands
            </h3>
            <button
              onClick={handleVoiceCommands}
              className={`flex items-center px-3 py-2 rounded text-sm ${
                isListening 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
              aria-label={isListening ? 'Stop listening' : 'Start voice commands'}
            >
              <Mic className={`mr-1 w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
              {isListening ? 'Stop Listening' : 'Start Voice Commands'}
            </button>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              Say: "read article", "pause", "resume", "stop"
            </div>
          </div>

          {/* Visual Accessibility */}
          <div className="space-y-3">
            <h3 className="font-medium text-zinc-900 dark:text-white flex items-center">
              <Eye className="mr-2 w-4 h-4" />
              Visual Accessibility
            </h3>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Font Size</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={decreaseFontSize}
                  className="p-1 bg-zinc-200 dark:bg-zinc-600 rounded hover:bg-zinc-300 dark:hover:bg-zinc-500"
                  aria-label="Decrease font size"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm min-w-[3rem] text-center">
                  {Math.round(preferences.fontSize)}px
                </span>
                <button
                  onClick={increaseFontSize}
                  className="p-1 bg-zinc-200 dark:bg-zinc-600 rounded hover:bg-zinc-300 dark:hover:bg-zinc-500"
                  aria-label="Increase font size"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">High Contrast</span>
              <button
                onClick={toggleHighContrast}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.highContrast ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
                aria-label="Toggle high contrast mode"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.highContrast ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              <Settings className="mr-1 w-4 h-4" />
              Advanced Settings
              <span className="ml-1">{showAdvanced ? '▲' : '▼'}</span>
            </button>

            {showAdvanced && (
              <div className="space-y-3 pl-4 border-l-2 border-zinc-200 dark:border-zinc-600">
                {/* Speech Rate */}
                <div>
                  <label className="block text-sm text-zinc-700 dark:text-zinc-300 mb-1">
                    Speech Rate: {preferences.rate.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={preferences.rate}
                    onChange={(e) => updateTTSSettings({ rate: parseFloat(e.target.value) })}
                    className="w-full"
                    aria-label="Speech rate"
                  />
                </div>

                {/* Speech Pitch */}
                <div>
                  <label className="block text-sm text-zinc-700 dark:text-zinc-300 mb-1">
                    Speech Pitch: {preferences.pitch.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={preferences.pitch}
                    onChange={(e) => updateTTSSettings({ pitch: parseFloat(e.target.value) })}
                    className="w-full"
                    aria-label="Speech pitch"
                  />
                </div>

                {/* Volume */}
                <div>
                  <label className="block text-sm text-zinc-700 dark:text-zinc-300 mb-1">
                    Volume: {Math.round(preferences.volume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={preferences.volume}
                    onChange={(e) => updateTTSSettings({ volume: parseFloat(e.target.value) })}
                    className="w-full"
                    aria-label="Volume"
                  />
                </div>

                {/* Voice Selection */}
                {voices.length > 0 && (
                  <div>
                    <label className="block text-sm text-zinc-700 dark:text-zinc-300 mb-1">
                      Voice
                    </label>
                    <select
                      value={preferences.voice}
                      onChange={(e) => updateTTSSettings({ voice: e.target.value })}
                      className="w-full p-2 border border-zinc-300 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-700"
                      aria-label="Select voice"
                    >
                      <option value="">Default Voice</option>
                      {voices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Help */}
          <div className="text-xs text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-200 dark:border-zinc-600">
            <p><strong>Keyboard shortcuts:</strong></p>
            <p>• Space: Play/Pause reading</p>
            <p>• Escape: Stop reading</p>
            <p>• Ctrl/Cmd + Plus: Increase font size</p>
            <p>• Ctrl/Cmd + Minus: Decrease font size</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityPanel;
