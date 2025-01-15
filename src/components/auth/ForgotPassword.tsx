import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/hooks/useAuth';

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { resetPassword } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setMessage('');
      setError('');
      setLoading(true);
      await resetPassword(email);
      setMessage('Check your inbox for further instructions');
    } catch (err) {
      setError('Failed to reset password');
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center text-2xl font-bold mb-4">Password Reset</h2>
          {error && <div className="alert alert-error mb-4">{error}</div>}
          {message && <div className="alert alert-success mb-4">{message}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                placeholder="email@example.com"
                className="input input-bordered"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full mt-4"
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner" /> : 'Reset Password'}
            </button>
          </form>
          <div className="text-center mt-4">
            <div className="mb-2">
              <Link to="/login" className="link link-hover">
                Back to Login
              </Link>
            </div>
            <span className="text-sm">
              Need an account?{' '}
              <Link to="/register" className="link link-hover">
                Sign up
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 