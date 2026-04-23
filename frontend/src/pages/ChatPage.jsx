import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getConversations, getMessages, getChatUsers, moderateChatMessage } from '../services/api';
import { io } from 'socket.io-client';
import { Send, Search, MessageCircle, Users, Circle, User, Sparkles, Loader } from 'lucide-react';

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [showUsers, setShowUsers] = useState(false);
  const [chatWarning, setChatWarning] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    const socket = io('/');
    socketRef.current = socket;
    socket.emit('register', user._id);
    socket.on('onlineUsers', (users) => setOnlineUsers(users));
    socket.on('newMessage', (msg) => {
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });
    socket.on('userTyping', ({ senderId }) => {
      if (senderId === selectedUser?._id) setTyping(true);
    });
    socket.on('userStopTyping', () => setTyping(false));
    fetchConversations();
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const fetchConversations = async () => {
    try {
      const [convRes, usersRes] = await Promise.all([getConversations(), getChatUsers()]);
      setConversations(convRes.data.conversations || []);
      setChatUsers(usersRes.data.users || []);
    } catch {}
    finally { setLoading(false); }
  };

  const selectUser = async (u) => {
    setSelectedUser(u);
    setMsgLoading(true);
    setShowUsers(false);
    try {
      const res = await getMessages(u._id);
      setMessages(res.data.messages || []);
    } catch { setMessages([]); }
    finally { setMsgLoading(false); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedUser) return;

    try {
      const moderation = await moderateChatMessage(newMsg);
      if (moderation.data?.isBlocked) {
        setChatWarning(moderation.data.warnings?.[0] || 'Message blocked by chat safety policy.');
        return;
      }
      setChatWarning('');
    } catch {
      // If moderation endpoint fails, continue with normal chat flow.
    }

    socketRef.current?.emit('sendMessage', { senderId: user._id, receiverId: selectedUser._id, content: newMsg });
    socketRef.current?.emit('stopTyping', { senderId: user._id, receiverId: selectedUser._id });
    setNewMsg('');
  };

  const handleTyping = (e) => {
    setNewMsg(e.target.value);
    if (selectedUser) {
      socketRef.current?.emit('typing', { senderId: user._id, receiverId: selectedUser._id });
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socketRef.current?.emit('stopTyping', { senderId: user._id, receiverId: selectedUser._id });
      }, 1500);
    }
  };

  const allUsers = [
    ...conversations.map(c => c.partner),
    ...chatUsers.filter(u => !conversations.find(c => c.partner?._id === u._id))
  ];
  const filtered = allUsers.filter(u => u.name?.toLowerCase().includes(searchQ.toLowerCase()));
  const isOnline = (uid) => onlineUsers.includes(uid);

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4 animate-fade-in-up">
      {/* Sidebar */}
      <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 shrink-0 glass rounded-2xl overflow-hidden`}>
        <div className="p-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3"><MessageCircle className="w-5 h-5 text-teal-400" />Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search users..." className="input-dark pl-10 py-2 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader className="w-6 h-6 text-teal-400 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-4"><Users className="w-8 h-8 text-dark-500 mx-auto mb-2" /><p className="text-sm text-dark-400">No users found</p></div>
          ) : (
            filtered.map(u => (
              <button key={u._id} onClick={() => selectUser(u)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all hover:bg-white/5 ${selectedUser?._id === u._id ? 'bg-white/8 border-l-2 border-teal-400' : ''}`}>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center"><User className="w-5 h-5 text-white" /></div>
                  {isOnline(u._id) && <Circle className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 text-green-400 fill-green-400" />}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.name}</p>
                  <p className="text-xs text-dark-400">{isOnline(u._id) ? 'Online' : 'Offline'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`${selectedUser ? 'flex' : 'hidden md:flex'} flex-col flex-1 glass rounded-2xl overflow-hidden`}>
        {selectedUser ? (
          <>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
              <button onClick={() => setSelectedUser(null)} className="md:hidden text-dark-300 hover:text-white mr-2">←</button>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-primary-500 flex items-center justify-center"><User className="w-5 h-5 text-white" /></div>
                {isOnline(selectedUser._id) && <Circle className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 text-green-400 fill-green-400" />}
              </div>
              <div>
                <p className="font-semibold text-white">{selectedUser.name}</p>
                <p className="text-xs text-dark-400">{isOnline(selectedUser._id) ? 'Online' : 'Offline'}{typing ? ' • typing...' : ''}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgLoading ? (
                <div className="flex items-center justify-center h-full"><Loader className="w-6 h-6 text-teal-400 animate-spin" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-dark-500">
                  <Sparkles className="w-10 h-10 mb-3 text-dark-600" /><p className="text-sm">Start a conversation!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = (msg.sender?._id || msg.sender) === user._id;
                  return (
                    <div key={msg._id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMine ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-br-md' : 'glass text-dark-100 rounded-bl-md'}`}>
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMine ? 'text-white/50' : 'text-dark-500'}`}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t border-white/5">
              {chatWarning && (
                <p className="mb-2 text-xs text-rose-400">
                  {chatWarning} Avoid sharing personal medical advice or promotions.
                </p>
              )}
              <div className="flex gap-2">
                <input type="text" value={newMsg} onChange={handleTyping} placeholder="Type a message..." className="input-dark flex-1 py-2.5" id="chat-input" />
                <button type="submit" disabled={!newMsg.trim()} className="btn-primary px-4 disabled:opacity-50" id="chat-send"><Send className="w-5 h-5" /></button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-dark-500">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400/20 to-primary-500/20 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-teal-400" />
            </div>
            <p className="text-lg font-medium text-dark-300">Select a conversation</p>
            <p className="text-sm">Choose a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
