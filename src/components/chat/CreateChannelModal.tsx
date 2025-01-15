import { useState } from 'react';
import { useChannel } from '../../contexts/channel/useChannel';
import { useToast } from '../../contexts/useToast';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateChannelModal({ isOpen, onClose }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createChannel, isLoading } = useChannel();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with:', { name, description });
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      console.log('Attempting to create channel...');
      const channelId = await createChannel(name.trim(), description.trim() || undefined);
      console.log('Channel created with ID:', channelId);
      showToast('Channel created successfully', 'success');
      onClose();
      // Reset form
      setName('');
      setDescription('');
    } catch (error) {
      console.error('Error creating channel:', error);
      showToast(error instanceof Error ? error.message : 'Failed to create channel', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Create a new channel</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Channel name</span>
            </label>
            <input
              type="text"
              placeholder="e.g. project-updates"
              className="input input-bordered"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Description</span>
              <span className="label-text-alt">Optional</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              placeholder="What's this channel about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim() || isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating...
                </>
              ) : (
                'Create Channel'
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}>
        <button className="cursor-default">Close</button>
      </div>
    </div>
  );
} 