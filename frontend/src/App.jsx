import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import HomeFeed from './pages/HomeFeed';
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
import ChatPage from './pages/ChatPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ProfilePage from './pages/ProfilePage';
import ResetPassword from './pages/ResetPassword';
import AdminModeration from './pages/AdminModeration';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <p className="text-dark-300 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <p className="text-dark-300 text-sm animate-pulse-slow">SkinSupport AI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {user && <Navbar />}
      <main className={user ? 'pt-20 pb-8 px-4 sm:px-6 max-w-7xl mx-auto' : ''}>
        <Routes>
          <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
          <Route path="/" element={<ProtectedRoute><HomeFeed /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
          <Route path="/post/:id" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminModeration /></ProtectedRoute>} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <div className="medical-disclaimer">
        This platform is for sharing personal experiences only. It does not provide medical advice or guaranteed treatments. Please consult a certified medical professional.
      </div>
    </div>
  );
}
