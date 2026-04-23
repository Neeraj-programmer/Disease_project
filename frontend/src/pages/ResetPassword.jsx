import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../services/api';
import { Lock, Sparkles, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      await resetPassword(token, { password });
      setSuccess(true);
      setTimeout(() => navigate('/auth'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. Token may be expired.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-primary-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">SkinSupport AI</span>
        </div>

        <div className="glass rounded-2xl p-8 animate-fade-in-up">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-teal-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Password Reset!</h2>
              <p className="text-dark-300 text-sm">Redirecting to login...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Set New Password</h2>
              <p className="text-dark-400 text-sm mb-6">Enter your new password below</p>

              {error && (
                <div className="glass rounded-xl p-3 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <p className="text-rose-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="New password" className="input-dark pl-10" required minLength={6} />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Confirm password" className="input-dark pl-10" required minLength={6} />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          <Link to="/auth" className="flex items-center gap-2 text-sm text-dark-400 hover:text-white mt-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
