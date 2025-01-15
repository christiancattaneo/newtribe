import { createContext } from 'react';
import type { ToastContextType } from './types';

const defaultContext: ToastContextType = {
  showToast: () => {},
  toasts: [],
  removeToast: () => {}
};

export const ToastContext = createContext<ToastContextType>(defaultContext); 