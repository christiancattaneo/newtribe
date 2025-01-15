import { useState, useCallback } from 'react';
import type { Toast, ToastType } from './types';
import { ToastContext } from './toast-context';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [nextId, setNextId] = useState(1);

  const removeToast = useCallback((id: number) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = nextId;
    setNextId(prev => prev + 1);
    
    setToasts(currentToasts => [...currentToasts, { id, message, type }]);
    
    setTimeout(() => removeToast(id), 3000);
  }, [nextId, removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
      <div className="toast toast-end">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`alert alert-${toast.type}`}
            onClick={() => removeToast(toast.id)}
          >
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
} 