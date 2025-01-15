import { toast } from 'react-toastify';

export function useToast() {
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    toast(message, {
      type,
      position: 'bottom-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  return { showToast };
} 