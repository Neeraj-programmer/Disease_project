import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, loginUser, forgotPassword } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mail, Lock, User, Heart, ArrowRight, Shield, Users, Brain, X, CheckCircle } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', bio: '', conditionDetails: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotLoading(true); setForgotMsg('');
    try {
      const res = await forgotPassword({ email: forgotEmail });
      setForgotMsg(res.data.message);
    } catch { setForgotMsg('Something went wrong. Please try again.'); }
    finally { setForgotLoading(false); }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = isLogin ? await loginUser(form) : await registerUser(form);
      login(res.data.user, res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Heart, title: 'Share Experiences', desc: 'Connect through your journey' },
    { icon: Brain, title: 'AI Insights', desc: 'Smart pattern detection' },
    { icon: Users, title: 'Community', desc: 'Find people like you' },
    { icon: Shield, title: 'Privacy First', desc: 'Anonymous posting option' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left – Branding */}
        <div className="hidden md:block space-y-8 pr-8">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-primary-500 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">SkinSupport AI</h1>
                <p className="text-sm text-dark-400">Community Health Platform</p>
              </div>
            </div>
            <p className="text-dark-200 text-lg leading-relaxed">
              Join a supportive community of people navigating psoriasis and skin conditions together. 
              Share your experiences, discover treatments, and find hope.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="glass rounded-xl p-4 hover:border-white/15 transition-all duration-300 group"
              >
                <f.icon className="w-6 h-6 text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                <p className="text-xs text-dark-400 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-dark-500 leading-relaxed">
            ⚠️ This platform is for sharing personal experiences and community support only. 
            It is NOT a medical diagnosis or treatment system.
          </p>
        </div>

        {/* Right – Form */}
        <div className="glass-strong rounded-3xl p-8 glow-primary">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-3 mb-6 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-primary-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">SkinSupport AI</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-dark-400 mb-6">
            {isLogin ? 'Sign in to your community' : 'Start your support journey'}
          </p>

          <div className="mb-5 grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isLogin ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                !isLogin ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              New User? Create Account
            </button>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 mb-4 text-sm text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  name="name"
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={handleChange}
                  required={!isLogin}
                  className="input-dark pl-10"
                  id="auth-name"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                name="email"
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={handleChange}
                required
                className="input-dark pl-10"
                id="auth-email"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                name="password"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className="input-dark pl-10"
                id="auth-password"
              />
            </div>

            {!isLogin && (
              <>
                <textarea
                  name="bio"
                  placeholder="Tell us about yourself (optional)"
                  value={form.bio}
                  onChange={handleChange}
                  rows={2}
                  className="input-dark resize-none"
                  id="auth-bio"
                />
                <textarea
                  name="conditionDetails"
                  placeholder="Describe your skin condition journey (optional)"
                  value={form.conditionDetails}
                  onChange={handleChange}
                  rows={2}
                  className="input-dark resize-none"
                  id="auth-condition"
                />
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              id="auth-submit"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {isLogin && (
            <button onClick={() => setShowForgot(true)} className="block w-full text-center text-sm text-dark-400 hover:text-accent-400 transition-colors mt-3">
              Forgot your password?
            </button>
          )}

          <p className="text-center text-sm text-dark-400 mt-4">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-teal-400 font-medium hover:text-teal-300 transition-colors"
              id="auth-toggle"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>

          {/* Forgot Password Modal */}
          {showForgot && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowForgot(false)}>
              <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Reset Password</h3>
                  <button onClick={() => setShowForgot(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                {forgotMsg ? (
                  <div className="text-center py-4">
                    <CheckCircle className="w-10 h-10 text-teal-400 mx-auto mb-3" />
                    <p className="text-sm text-dark-200">{forgotMsg}</p>
                    <button onClick={() => { setShowForgot(false); setForgotMsg(''); }} className="btn-primary mt-4 text-sm">Done</button>
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-4">
                    <p className="text-sm text-dark-300">Enter your email and we'll send a reset link.</p>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                      <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="Email address" className="input-dark pl-10" required />
                    </div>
                    <button type="submit" disabled={forgotLoading} className="btn-primary w-full py-2.5 text-sm disabled:opacity-50">
                      {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
