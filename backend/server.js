// ==========================================
// 🚀 SkinSupport AI - Backend Main Server File
// ==========================================
// Ye file hamare backend ka entry point (main darwaza) hai. 
// Yahan par hum server start karte hain aur saari routes (paths) ko connect karte hain.

const express = require('express'); // Express framework for creating the server
const http = require('http'); // Node.js ka built-in module for HTTP server
const path = require('path'); // File paths ko handle karne ke liye
const { Server } = require('socket.io'); // Socket.io for real-time features (jaise chat)
const mongoose = require('mongoose'); // Mongoose for connecting to MongoDB database
const cors = require('cors'); // CORS allows frontend (React) to talk to backend
const dotenv = require('dotenv'); // To read secret variables from .env file

dotenv.config(); // Ye line .env file se saari settings ko load karti hai

// ── 1. SERVER INITIALIZATION ──
const app = express(); // Naya express app banana
const server = http.createServer(app); // HTTP server create karna

// Socket.io ka setup: Ye frontend ko real-time connect karne deta hai.
const io = new Server(server, {
  cors: {
    // Sirf is frontend URL ko allow karo connect karne ke liye
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// ── 2. MIDDLEWARES (Security & Data Handling) ──
// Ye middlewares har request aane se pehle run hote hain
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));

// Client se jo data (JSON) aayega, usko padhne ke liye. Limit 10mb rakhi hai taaki heavy images na aaye.
app.use(express.json({ limit: '10mb' }));

// Agar koi image upload karta hai, toh usko browser me dekhne ke liye ye route hai
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── 3. ROUTES (Paths for different features) ──
// Har feature ke liye alag alag file banayi gayi hai.
const authRoutes = require('./routes/auth'); // Login/Signup routes
const postRoutes = require('./routes/posts'); // Create/View Posts routes
const chatRoutes = require('./routes/chat'); // Chat routes
const analyticsRoutes = require('./routes/analytics'); // Data analytics routes
const userRoutes = require('./routes/users'); // Profile routes
const notificationRoutes = require('./routes/notifications'); // Notifications routes
const reportRoutes = require('./routes/reports'); // Moderation/Report routes
const { moderateChat } = require('./services/moderationService'); // Function to check safe chats

// Ab in routes ko app me attach karte hain
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

// Ek simple health check route yeh dekhne ke liye ki server chal raha hai ya nahi
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SkinSupport API is running smoothly!' });
});

// ── 4. REAL-TIME CHAT (Socket.io) ──
// Ye map un users ko track karta hai jo abhi online hain
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected with socket ID:', socket.id);

  // Jab koi naya user login hoke apna ID bhejta hai
  socket.on('register', (userId) => {
    onlineUsers.set(userId, socket.id); // User ko online list me add karo
    io.emit('onlineUsers', Array.from(onlineUsers.keys())); // Sabko batao kon online hai
  });

  // Jab koi kisi ko message bhejta hai
  socket.on('sendMessage', async (data) => {
    const { senderId, receiverId, content } = data;
    try {
      // Step A: Pehle check karo ki message safe hai ya nahi (No spam/abusive words)
      const chatSafety = moderateChat(content || '');
      if (chatSafety.isBlocked) {
        socket.emit('messageError', {
          error: 'Message blocked by safety policy.',
          warnings: chatSafety.warnings,
        });
        return; // Agar message unsafe hai toh yahi stop kardo
      }

      // Step B: Message safe hai, toh usko Database me save karo
      const Message = require('./models/Message');
      const Notification = require('./models/Notification');
      const message = await Message.create({ sender: senderId, receiver: receiverId, content });
      const populated = await message.populate('sender', 'name email');

      // Step C: Check karo ki jisko message bheja, kya wo user online hai?
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        // Agar wo online hai toh usko turant message bhej do
        io.to(receiverSocketId).emit('newMessage', populated);
      }
      
      // Bhejne wale (sender) ko bhi wapis bhejo confirm karne ke liye ki message chala gaya
      socket.emit('newMessage', populated);

      // Step D: Naya Notification create karo database me
      const notification = await Notification.create({
        recipient: receiverId,
        sender: senderId,
        type: 'message',
        message: `sent you a message`,
      });
      
      // Agar receiver online hai, toh notification bhi live screen par bhej do
      if (receiverSocketId) {
        const populatedNotif = await notification.populate('sender', 'name avatar');
        io.to(receiverSocketId).emit('newNotification', populatedNotif);
      }
    } catch (err) {
      console.error('Message send karne me error aaya:', err);
      socket.emit('messageError', { error: 'Failed to send message' });
    }
  });

  // Typing animation ke liye event
  socket.on('typing', ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('userTyping', { senderId });
    }
  });

  // Jab typing stop ho jaye
  socket.on('stopTyping', ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('userStopTyping', { senderId });
    }
  });

  // Jab user tab close kar de ya disconnect ho jaye
  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId); // Online list se hatao
        break;
      }
    }
    // Baaki bache users ko updated list bhejo
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    console.log('User disconnected:', socket.id);
  });
});

// ── 5. MONGODB CONNECTION & START SERVER ──
const PORT = process.env.PORT || 5500;

mongoose
  .connect(process.env.MONGO_URI) // Database se connection banate hain
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    // Agar DB connect ho jaye, tabhi server ko PORT par listen karwao
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1); // Agar DB connect na ho, toh server stop kardo
  });

module.exports = { app, io };
