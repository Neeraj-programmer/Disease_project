import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markAllNotificationsRead, markNotificationRead, clearAllNotifications } from '../services/api';
import { io } from 'socket.io-client';
import { Bell, Check, CheckCheck, Trash2, Heart, MessageSquare, MessageCircle, Sparkles, X } from 'lucide-react';

const TYPE_ICONS = { comment: MessageSquare, reaction: Heart, message: MessageCircle, ai_insight: Sparkles };
const TYPE_COLORS = { comment: 'text-primary-400', reaction: 'text-rose-400', message: 'text-teal-400', ai_insight: 'text-accent-400' };

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetchNotifications();
    // Listen for real-time notifications
    const SOCKET_URL = import.meta.env.PROD ? 'https://disease-project-1.onrender.com' : '/';
    const socket = io(SOCKET_URL);
    socket.emit('register', user?._id);
    socket.on('newNotification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnread(prev => prev + 1);
    });
    return () => socket.disconnect();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications || []);
      setUnread(res.data.unreadCount || 0);
    } catch { }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch { }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch { }
  };

  const handleClear = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnread(0);
    } catch { }
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-2 text-dark-300 hover:text-green-300 transition-colors" id="notification-bell">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse-slow">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 glass-strong rounded-2xl overflow-hidden z-50 animate-fade-in-up" style={{ maxHeight: '70vh' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="font-semibold text-white text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1" title="Mark all read">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={handleClear} className="text-xs text-dark-400 hover:text-rose-400 flex items-center gap-1" title="Clear all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-dark-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 48px)' }}>
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 text-dark-600 mx-auto mb-2" />
                <p className="text-sm text-dark-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICONS[n.type] || Bell;
                const color = TYPE_COLORS[n.type] || 'text-dark-300';
                return (
                  <div key={n._id}
                    onClick={() => !n.isRead && handleMarkRead(n._id)}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/3 ${!n.isRead ? 'bg-white/3' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.isRead ? 'bg-white/10' : 'bg-white/5'}`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-dark-200">
                        <span className="font-medium text-white">{n.sender?.name || 'Someone'}</span>{' '}{n.message}
                      </p>
                      <p className="text-xs text-dark-500 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-teal-400 mt-2 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
