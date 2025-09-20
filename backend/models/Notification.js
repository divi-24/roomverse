const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  type: {
    type: String,
    enum: [
      'booking_request',
      'booking_approved',
      'booking_rejected',
      'payment_success',
      'payment_failed',
      'review_added',
      'message_received',
      'panic_alert',
      'late_notification',
      'location_shared',
      'complaint_raised',
      'complaint_resolved',
      'hostel_verified',
      'hostel_rejected',
      'maintenance_request',
      'announcement',
      'system_alert'
    ],
    required: true
  },
  
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  
  // Related entities
  relatedEntity: {
    type: {
      type: String,
      enum: ['hostel', 'booking', 'review', 'chat', 'payment', 'complaint', 'user']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  
  // Additional data
  data: {
    // For location notifications
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    // For payment notifications
    amount: Number,
    currency: String,
    transactionId: String,
    // For booking notifications
    hostelName: String,
    checkInDate: Date,
    checkOutDate: Date,
    // For panic alerts
    emergencyContacts: [String],
    // For late notifications
    expectedTime: Date,
    actualTime: Date
  },
  
  // Delivery channels
  channels: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    }
  },
  
  // Status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  
  // Delivery status
  deliveryStatus: {
    inApp: {
      sent: { type: Boolean, default: false },
      sentAt: Date
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      messageId: String,
      error: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      messageId: String,
      error: String
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      error: String
    }
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Expiry
  expiresAt: Date,
  
  // Action buttons
  actions: [{
    label: String,
    action: String,
    url: String,
    style: {
      type: String,
      enum: ['primary', 'secondary', 'danger', 'success'],
      default: 'primary'
    }
  }]
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to set expiry for certain notification types
notificationSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    // Set default expiry based on notification type
    const expiryMap = {
      'panic_alert': 24 * 60 * 60 * 1000, // 24 hours
      'late_notification': 12 * 60 * 60 * 1000, // 12 hours
      'booking_request': 7 * 24 * 60 * 60 * 1000, // 7 days
      'payment_success': 30 * 24 * 60 * 60 * 1000, // 30 days
      'review_added': 30 * 24 * 60 * 60 * 1000, // 30 days
      'message_received': 7 * 24 * 60 * 60 * 1000, // 7 days
      'announcement': 30 * 24 * 60 * 60 * 1000, // 30 days
      'system_alert': 7 * 24 * 60 * 60 * 1000 // 7 days
    };
    
    const defaultExpiry = expiryMap[this.type] || 30 * 24 * 60 * 60 * 1000; // 30 days default
    this.expiresAt = new Date(Date.now() + defaultExpiry);
  }
  next();
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to mark delivery status
notificationSchema.methods.markDelivered = function(channel, messageId = null, error = null) {
  if (this.deliveryStatus[channel]) {
    this.deliveryStatus[channel].sent = true;
    this.deliveryStatus[channel].sentAt = new Date();
    if (messageId) this.deliveryStatus[channel].messageId = messageId;
    if (error) this.deliveryStatus[channel].error = error;
  }
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(notificationData) {
  const notification = new this(notificationData);
  await notification.save();
  
  // Emit real-time notification if Socket.IO is available
  const io = require('../server').io;
  if (io) {
    io.to(`user-${notification.recipient}`).emit('new-notification', {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      createdAt: notification.createdAt
    });
  }
  
  return notification;
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    recipient: userId,
    isRead: false,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);
