import { CelticKnot } from './CelticKnot';
import { useAuth } from '../contexts/hooks/useAuth';
import { useToast } from '../contexts/useToast';

export default function Header() {
  const { signOut } = useAuth();
  const { showToast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast('Signed out successfully', 'success');
    } catch (error) {
      console.error('Error signing out:', error);
      showToast('Failed to sign out', 'error');
    }
  };

  return (
    <header className="navbar bg-base-100 border-b">
      <div className="flex-1">
        <div className="flex items-center gap-4">
          <a className="btn btn-ghost normal-case text-xl flex items-center gap-2">
            <CelticKnot className="w-8 h-8" />
            <span>Tribe</span>
          </a>
        </div>
      </div>
      <div className="flex-none pr-4">
        <button onClick={handleSignOut} className="btn btn-ghost btn-circle btn-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
} 