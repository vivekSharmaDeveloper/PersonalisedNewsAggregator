import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastData } from '@/types';

interface ToastContextType {
  showToast: (message: string, type?: ToastData['type']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<(ToastData & { id: string })[]>([]);

  const showToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = Date.now().toString();
    const toast = { id, message, type };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

interface ToastProps {
  message: string;
  type: ToastData['type'];
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <div
      className={`px-4 py-2 rounded-lg shadow-lg cursor-pointer transition-all duration-300 ${getToastStyles()}`}
      onClick={onClose}
    >
      {message}
    </div>
  );
};

// For backward compatibility
export const Toaster = () => null;
