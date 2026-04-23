const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const chatRoutes = require('./routes/chat');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const { moderateChat } = require('./services/moderationService');

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SkinSupport API is running' });
});

// ── Socket.io for real-time chat ──
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });

  socket.on('sendMessage', async (data) => {
    const { senderId, receiverId, content } = data;
    try {
      const chatSafety = moderateChat(content || '');
      if (chatSafety.isBlocked) {
        socket.emit('messageError', {
          error: 'Message blocked by safety policy.',
          warnings: chatSafety.warnings,
        });
        return;
      }

      const Message = require('./models/Message');
      const Notification = require('./models/Notification');
      const message = await Message.create({ sender: senderId, receiver: receiverId, content });
      const populated = await message.populate('sender', 'name email');

      // Send to receiver if online
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('newMessage', populated);
      }
      // Send back to sender for confirmation
      socket.emit('newMessage', populated);

      // Create notification for new message
      const notification = await Notification.create({
        recipient: receiverId,
        sender: senderId,
        type: 'message',
        message: `sent you a message`,
      });
      // Emit real-time notification
      if (receiverSocketId) {
        const populatedNotif = await notification.populate('sender', 'name avatar');
        io.to(receiverSocketId).emit('newNotification', populatedNotif);
      }
    } catch (err) {
      console.error('Message error:', err);
      socket.emit('messageError', { error: 'Failed to send message' });
    }
  });

  socket.on('typing', ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('userTyping', { senderId });
    }
  });

  socket.on('stopTyping', ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('userStopTyping', { senderId });
    }
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    console.log('User disconnected:', socket.id);
  });
});

// ── MongoDB Connection & Server Start ──
const PORT = process.env.PORT || 5500;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = { app, io };
