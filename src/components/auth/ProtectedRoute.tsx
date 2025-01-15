import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/hooks/useAuth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">
      <span className="loading loading-spinner loading-lg"></span>
    </div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return children;
} 