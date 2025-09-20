const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const hostelRoutes = require('./routes/hostels');
const reviewRoutes = require('./routes/reviews');
const chatRoutes = require('./routes/chats');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const bookingRoutes = require('./routes/bookings');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bookings', bookingRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User authentication and room joining
  socket.on('authenticate', (data) => {
    const { userId, role } = data;
    socket.userId = userId;
    socket.role = role;
    
    // Join user-specific room for notifications
    socket.join(`user-${userId}`);
    
    // Join role-specific rooms
    if (role === 'HostelOwner') {
      socket.join('hostel-owners');
    } else if (role === 'Student') {
      socket.join('students');
    } else if (role === 'Admin') {
      socket.join('admins');
    }
    
    console.log(`User ${userId} (${role}) authenticated and joined rooms`);
  });

  // Join room for hostel chat
  socket.on('join-hostel', (hostelId) => {
    socket.join(`hostel-${hostelId}`);
    console.log(`User ${socket.id} joined hostel ${hostelId}`);
  });

  // Join room for private chat
  socket.on('join-private', (chatId) => {
    socket.join(`private-${chatId}`);
    console.log(`User ${socket.id} joined private chat ${chatId}`);
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    const { chatId, message, type, sender } = data;
    const room = type === 'hostel' ? `hostel-${chatId}` : `private-${chatId}`;
    
    // Broadcast message to room
    socket.to(room).emit('receive-message', {
      ...data,
      timestamp: new Date(),
      id: Date.now().toString()
    });
    
    // Send typing indicator stop
    socket.to(room).emit('typing-stop', { userId: sender.id });
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    const { chatId, type, user } = data;
    const room = type === 'hostel' ? `hostel-${chatId}` : `private-${chatId}`;
    socket.to(room).emit('typing-start', { user });
  });

  socket.on('typing-stop', (data) => {
    const { chatId, type, userId } = data;
    const room = type === 'hostel' ? `hostel-${chatId}` : `private-${chatId}`;
    socket.to(room).emit('typing-stop', { userId });
  });

  // Handle location sharing
  socket.on('share-location', (data) => {
    const { hostelId, location, userId, userName } = data;
    socket.to(`hostel-${hostelId}`).emit('location-update', { 
      userId, 
      userName,
      location, 
      timestamp: new Date() 
    });
  });

  // Handle panic button
  socket.on('panic-alert', (data) => {
    const { hostelId, location, userId, userName, message } = data;
    const alertData = { 
      userId, 
      userName,
      location, 
      message: message || 'Emergency alert triggered!',
      timestamp: new Date(),
      type: 'panic'
    };
    
    // Send to hostel room
    socket.to(`hostel-${hostelId}`).emit('panic-alert', alertData);
    
    // Send to all admins
    socket.to('admins').emit('emergency-alert', alertData);
    
    console.log(`Panic alert from user ${userId} in hostel ${hostelId}`);
  });

  // Handle booking updates
  socket.on('booking-update', (data) => {
    const { bookingId, status, studentId, ownerId, hostelId } = data;
    
    // Notify student
    if (studentId) {
      socket.to(`user-${studentId}`).emit('booking-status-update', {
        bookingId,
        status,
        timestamp: new Date()
      });
    }
    
    // Notify owner
    if (ownerId) {
      socket.to(`user-${ownerId}`).emit('booking-status-update', {
        bookingId,
        status,
        timestamp: new Date()
      });
    }
  });

  // Handle real-time availability updates
  socket.on('availability-update', (data) => {
    const { hostelId, roomType, availableRooms } = data;
    
    // Broadcast to all users viewing this hostel
    socket.broadcast.emit('hostel-availability-update', {
      hostelId,
      roomType,
      availableRooms,
      timestamp: new Date()
    });
  });

  // Handle online status
  socket.on('user-online', (userId) => {
    socket.broadcast.emit('user-status-change', {
      userId,
      status: 'online',
      timestamp: new Date()
    });
  });

  socket.on('user-offline', (userId) => {
    socket.broadcast.emit('user-status-change', {
      userId,
      status: 'offline',
      timestamp: new Date()
    });
  });

  // Handle file sharing in chat
  socket.on('file-share', (data) => {
    const { chatId, type, file, sender } = data;
    const room = type === 'hostel' ? `hostel-${chatId}` : `private-${chatId}`;
    
    socket.to(room).emit('file-received', {
      ...data,
      timestamp: new Date(),
      id: Date.now().toString()
    });
  });

  // Handle voice messages
  socket.on('voice-message', (data) => {
    const { chatId, type, audioData, duration, sender } = data;
    const room = type === 'hostel' ? `hostel-${chatId}` : `private-${chatId}`;
    
    socket.to(room).emit('voice-message-received', {
      ...data,
      timestamp: new Date(),
      id: Date.now().toString()
    });
  });

  // Handle payment notifications
  socket.on('payment-update', (data) => {
    const { bookingId, status, amount, studentId, ownerId } = data;
    
    // Notify both student and owner
    [studentId, ownerId].filter(Boolean).forEach(userId => {
      socket.to(`user-${userId}`).emit('payment-notification', {
        bookingId,
        status,
        amount,
        timestamp: new Date()
      });
    });
  });

  // Handle system announcements
  socket.on('system-announcement', (data) => {
    const { message, type, targetRole } = data;
    
    if (targetRole === 'all') {
      socket.broadcast.emit('system-announcement', {
        ...data,
        timestamp: new Date()
      });
    } else {
      socket.to(targetRole).emit('system-announcement', {
        ...data,
        timestamp: new Date()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Notify others about user going offline
    if (socket.userId) {
      socket.broadcast.emit('user-status-change', {
        userId: socket.userId,
        status: 'offline',
        timestamp: new Date()
      });
    }
  });
});

// Make io accessible to routes
app.set('io', io);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/roomverse', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, io };
