import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import {
  Home,
  PlusCircle,
  MessageCircle,
  BarChart3,
  ShieldCheck,
  User,
  LogOut,
  Search,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileOpen(false);
    }
  };

  const navLinks = [
    { to: '/', icon: Home, label: 'Feed' },
    { to: '/create', icon: PlusCircle, label: 'Create' },
    { to: '/chat', icon: MessageCircle, label: 'Chat' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: `/profile/${user?._id}`, icon: User, label: 'Profile' },
  ];
  if (user?.role === 'admin') navLinks.splice(4, 0, { to: '/admin', icon: ShieldCheck, label: 'Admin' });

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" id="nav-logo">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-primary-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text hidden sm:block">
              SkinSupport AI
            </span>
          </Link>

          {/* Search bar – desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                placeholder="Search posts, treatments, triggers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-dark pl-10 py-2 text-sm"
                id="nav-search-input"
              />
            </div>
          </form>

          {/* Nav links – desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  id={`nav-${link.label.toLowerCase()}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${active
                    ? 'bg-white/10 text-teal-400'
                    : 'text-dark-300 hover:text-green-300 hover:bg-white/5'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <NotificationBell />
            <button
              onClick={handleLogout}
              id="nav-logout"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-dark-300 hover:text-rose-400 hover:bg-rose-400/10 transition-all ml-2"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-dark-300 hover:text-green-300"
            onClick={() => setMobileOpen(!mobileOpen)}
            id="nav-mobile-toggle"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass-strong border-t border-white/5 animate-fade-in-up">
          <div className="px-4 py-3">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-dark pl-10 py-2 text-sm"
                />
              </div>
            </form>
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${active
                    ? 'bg-white/10 text-teal-400'
                    : 'text-dark-300 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-dark-300 hover:text-rose-400 hover:bg-rose-400/10 transition-all w-full"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
