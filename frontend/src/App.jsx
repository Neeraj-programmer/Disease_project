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
import VerifyEmail from './pages/VerifyEmail';

// ==========================================
// 🛡️ ProtectedRoute Component
// ==========================================
// Ye component un pages ko protect karta hai jo bina login ke nahi dekhne chahiye.
// Agar user login nahi hai, toh ye use wapas Login page ("/auth") bhej deta hai.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth(); // AuthContext se pucho ki kya koi user logged in hai?

  // Jab tak backend se check ho raha hai, tab tak "Loading..." dikhao
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

  // Agar user logged in hai, toh page (children) dikhao, warna /auth par bhej do
  if (user) {
    return children;
  } else {
    return <Navigate to="/auth" replace />;
  }
}

// ==========================================
// 🚀 Main App Component
// ==========================================
// Ye application ka sabse main component hai jahan saare pages ke routes set hote hain.
export default function App() {
  const { user, loading } = useAuth();

  // App start hone par loading state dikhana
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
      {/* Agar user logged in hai, tabhi Upar wala Navbar dikhao */}
      {user && <Navbar />}

      {/* Main content area */}
      <main className={user ? 'pt-20 pb-8 px-4 sm:px-6 max-w-7xl mx-auto' : ''}>
        
        {/* Ye component decide karta hai ki konsi URL (link) par kon sa page khulega */}
        <Routes>
          {/* Agar user already logged in hai toh use AuthPage na dikha kar seedha Home pe bhej do */}
          <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
          
          {/* Neeche wale saare pages Protected hain (Bina login ke nahi khulenge) */}
          <Route path="/" element={<ProtectedRoute><HomeFeed /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
          <Route path="/post/:id" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminModeration /></ProtectedRoute>} />
          
          {/* Ye pages public hain */}
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          
          {/* Agar koi aisi URL dale jo hai hi nahi, toh wapas Home pe le jao */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Ek sticky footer jo Medical Disclaimer dikhata hai */}
      <div className="medical-disclaimer">
        This platform is for sharing personal experiences only. It does not provide medical advice or guaranteed treatments. Please consult a certified medical professional.
      </div>
    </div>
  );
}
