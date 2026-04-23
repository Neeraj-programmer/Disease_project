import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { verifyEmail } from '../services/api';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully!');
        // Optional: Auto-redirect to login
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed. Link might be expired.');
      });
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-strong rounded-3xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-teal-400 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Verifying Email</h2>
            <p className="text-dark-300">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-fade-in-up">
            <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Verification Complete</h2>
            <p className="text-dark-300 mb-6">{message}</p>
            <p className="text-sm text-dark-400 mb-4">Redirecting to login in a few seconds...</p>
            <Link to="/auth" className="btn-primary flex items-center justify-center gap-2">
              Go to Login <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-fade-in-up">
            <XCircle className="w-16 h-16 text-rose-400 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-rose-300/80 mb-6">{message}</p>
            <Link to="/auth" className="btn-secondary">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
