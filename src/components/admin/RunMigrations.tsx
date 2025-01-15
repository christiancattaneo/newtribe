import { useState } from 'react';
import { removePrivateChannels } from '../../utils/migrations/removePrivateChannels';
import { useToast } from '../../contexts/useToast';

export default function RunMigrations() {
  const [isRunning, setIsRunning] = useState(false);
  const { showToast } = useToast();

  const handleMigration = async () => {
    if (!confirm('Are you sure you want to run the migration? This will remove private channel settings.')) {
      return;
    }

    setIsRunning(true);
    try {
      await removePrivateChannels();
      showToast('Migration completed successfully', 'success');
    } catch (error) {
      console.error('Migration failed:', error);
      showToast('Migration failed', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4">
      <button 
        className="btn btn-warning" 
        onClick={handleMigration}
        disabled={isRunning}
      >
        {isRunning ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            Running Migration...
          </>
        ) : (
          'Remove Private Channels'
        )}
      </button>
    </div>
  );
} 