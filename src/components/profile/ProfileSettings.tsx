import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/hooks/useAuth';
import { useToast } from '../../contexts/useToast';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettings({ isOpen, onClose }: ProfileSettingsProps) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch user data when modal opens
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser || !isOpen) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setBio(userData.bio || '');
          setDisplayName(userData.displayName || currentUser.displayName || '');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        showToast('Failed to load profile data', 'error');
      }
    };

    fetchUserData();
  }, [currentUser, isOpen, showToast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsLoading(true);
    try {
      let photoURL = currentUser.photoURL;

      // Upload new photo if selected
      if (selectedFile) {
        const fileRef = ref(storage, `avatars/${currentUser.uid}/${selectedFile.name}`);
        await uploadBytes(fileRef, selectedFile);
        photoURL = await getDownloadURL(fileRef);
      }

      // Update auth profile
      await updateProfile(currentUser, {
        displayName,
        photoURL
      });

      // Update Firestore document
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName,
        photoURL,
        bio,
        updatedAt: new Date()
      });

      showToast('Profile updated successfully', 'success');
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Clean up preview URL when component unmounts or modal closes
  useEffect(() => {
    if (!isOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  }, [isOpen, previewUrl]);

  if (!isOpen) return null;

  return (
    <dialog open className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Profile Settings</h3>
        <form onSubmit={handleSubmit}>
          {/* Avatar Upload */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Profile Picture</span>
            </label>
            <div className="flex items-center gap-4">
              <div className="avatar">
                <div className="w-20 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  <img
                    src={previewUrl || currentUser?.photoURL || `https://ui-avatars.com/api/?name=${displayName || 'User'}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-outline btn-sm"
                >
                  Choose Image
                </button>
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Display Name</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input input-bordered"
              placeholder="Your display name"
              required
            />
          </div>

          {/* Bio */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Bio</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="textarea textarea-bordered h-24"
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Email (read-only) */}
          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              type="email"
              value={currentUser?.email || ''}
              className="input input-bordered"
              disabled
            />
            <label className="label">
              <span className="label-text-alt text-base-content/60">Email cannot be changed</span>
            </label>
          </div>

          {/* Actions */}
          <div className="modal-action">
            <button
              type="button"
              onClick={onClose}
              className="btn"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading loading-spinner" />
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
} 