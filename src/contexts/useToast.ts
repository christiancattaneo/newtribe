import { useContext } from 'react';
import { ToastContext } from './toast-context';
import type { ToastContextType } from './types';

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
} 