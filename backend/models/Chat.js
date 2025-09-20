const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: ['text', 'image', 'location', 'file', 'system'],
    default: 'text'
  },
  metadata: {
    // For location messages
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    // For file messages
    file: {
      url: String,
      name: String,
      size: Number,
      type: String
    },
    // For image messages
    image: {
      url: String,
      caption: String
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['private', 'hostel', 'group'],
    required: true
  },
  
  // For private chats
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  // For hostel chats
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel'
  },
  
  // For group chats
  groupName: String,
  groupDescription: String,
  groupImage: String,
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Chat settings
  settings: {
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    allowLocationSharing: {
      type: Boolean,
      default: true
    },
    muteNotifications: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      mutedUntil: Date
    }]
  },
  
  // Last message for quick access
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date,
    type: {
      type: String,
      enum: ['text', 'image', 'location', 'file', 'system'],
      default: 'text'
    }
  },
  
  // Unread count for each participant
  unreadCount: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    }
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Messages array
  messages: [messageSchema]
}, {
  timestamps: true
});

// Indexes
chatSchema.index({ participants: 1 });
chatSchema.index({ hostel: 1 });
chatSchema.index({ type: 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });

// Pre-save middleware to update last message
chatSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 0) {
    const lastMsg = this.messages[this.messages.length - 1];
    this.lastMessage = {
      content: lastMsg.content,
      sender: lastMsg.sender,
      timestamp: lastMsg.createdAt,
      type: lastMsg.type
    };
  }
  next();
});

// Method to add message
chatSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  
  // Update unread count for all participants except sender
  this.participants.forEach(participant => {
    if (participant.toString() !== messageData.sender.toString()) {
      const unreadEntry = this.unreadCount.find(entry => 
        entry.user.toString() === participant.toString()
      );
      
      if (unreadEntry) {
        unreadEntry.count += 1;
      } else {
        this.unreadCount.push({
          user: participant,
          count: 1
        });
      }
    }
  });
  
  return this.save();
};

// Method to mark messages as read
chatSchema.methods.markAsRead = function(userId) {
  // Mark all messages as read for this user
  this.messages.forEach(message => {
    if (!message.readBy.some(read => read.user.toString() === userId.toString())) {
      message.readBy.push({
        user: userId,
        readAt: new Date()
      });
    }
  });
  
  // Reset unread count for this user
  const unreadEntry = this.unreadCount.find(entry => 
    entry.user.toString() === userId.toString()
  );
  if (unreadEntry) {
    unreadEntry.count = 0;
  }
  
  return this.save();
};

// Method to get unread count for user
chatSchema.methods.getUnreadCount = function(userId) {
  const unreadEntry = this.unreadCount.find(entry => 
    entry.user.toString() === userId.toString()
  );
  return unreadEntry ? unreadEntry.count : 0;
};

// Method to check if user is participant
chatSchema.methods.isParticipant = function(userId) {
  return this.participants.some(participant => 
    participant.toString() === userId.toString()
  );
};

// Static method to find or create private chat
chatSchema.statics.findOrCreatePrivateChat = async function(user1Id, user2Id) {
  let chat = await this.findOne({
    type: 'private',
    participants: { $all: [user1Id, user2Id] }
  }).populate('participants', 'name email profileImage');
  
  if (!chat) {
    chat = new this({
      type: 'private',
      participants: [user1Id, user2Id],
      messages: []
    });
    await chat.save();
    await chat.populate('participants', 'name email profileImage');
  }
  
  return chat;
};

// Static method to find or create hostel chat
chatSchema.statics.findOrCreateHostelChat = async function(hostelId) {
  let chat = await this.findOne({
    type: 'hostel',
    hostel: hostelId
  }).populate('hostel', 'name');
  
  if (!chat) {
    chat = new this({
      type: 'hostel',
      hostel: hostelId,
      messages: []
    });
    await chat.save();
    await chat.populate('hostel', 'name');
  }
  
  return chat;
};

module.exports = mongoose.model('Chat', chatSchema);
