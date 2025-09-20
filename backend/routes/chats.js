const express = require('express');
const { body, validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user's chats
// @route   GET /api/chats
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const chats = await Chat.find({
      participants: req.user._id,
      isActive: true
    })
    .populate('participants', 'name email profileImage')
    .populate('hostel', 'name')
    .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Chat.countDocuments({
      participants: req.user._id,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        chats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalChats: total,
          hasNext: skip + chats.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching chats'
    });
  }
});

// @desc    Get single chat
// @route   GET /api/chats/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('participants', 'name email profileImage')
      .populate('hostel', 'name');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat'
      });
    }

    res.json({
      success: true,
      data: {
        chat
      }
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching chat'
    });
  }
});

// @desc    Get chat messages
// @route   GET /api/chats/:id/messages
// @access  Private
router.get('/:id/messages', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat'
      });
    }

    // Get messages with pagination
    const messages = chat.messages
      .filter(msg => !msg.isDeleted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(skip, skip + parseInt(limit))
      .reverse();

    // Populate sender information
    const populatedMessages = await Promise.all(
      messages.map(async (message) => {
        const sender = await User.findById(message.sender).select('name profileImage');
        return {
          ...message.toObject(),
          sender: {
            _id: sender._id,
            name: sender.name,
            profileImage: sender.profileImage
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        messages: populatedMessages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(chat.messages.length / parseInt(limit)),
          totalMessages: chat.messages.length,
          hasNext: skip + messages.length < chat.messages.length,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching messages'
    });
  }
});

// @desc    Create or get private chat
// @route   POST /api/chats/private
// @access  Private
router.post('/private', protect, [
  body('userId').isMongoId().withMessage('Valid user ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId } = req.body;

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow self-chat
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create chat with yourself'
      });
    }

    // Find or create private chat
    const chat = await Chat.findOrCreatePrivateChat(req.user._id, userId);

    res.json({
      success: true,
      data: {
        chat
      }
    });
  } catch (error) {
    console.error('Create private chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating chat'
    });
  }
});

// @desc    Create or get hostel chat
// @route   POST /api/chats/hostel
// @access  Private
router.post('/hostel', protect, [
  body('hostelId').isMongoId().withMessage('Valid hostel ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { hostelId } = req.body;

    // Find or create hostel chat
    const chat = await Chat.findOrCreateHostelChat(hostelId);

    // Add user to participants if not already there
    if (!chat.participants.includes(req.user._id)) {
      chat.participants.push(req.user._id);
      await chat.save();
    }

    await chat.populate('participants', 'name email profileImage');
    await chat.populate('hostel', 'name');

    res.json({
      success: true,
      data: {
        chat
      }
    });
  } catch (error) {
    console.error('Create hostel chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating chat'
    });
  }
});

// @desc    Send message
// @route   POST /api/chats/:id/messages
// @access  Private
router.post('/:id/messages', protect, [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Message content must be between 1 and 1000 characters'),
  body('type').optional().isIn(['text', 'image', 'location', 'file', 'system']).withMessage('Invalid message type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { content, type = 'text', metadata } = req.body;

    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages in this chat'
      });
    }

    // Create message
    const message = {
      sender: req.user._id,
      content,
      type,
      metadata,
      isRead: false,
      readBy: [{
        user: req.user._id,
        readAt: new Date()
      }]
    };

    // Add message to chat
    await chat.addMessage(message);

    // Get the last message with populated sender
    const lastMessage = chat.messages[chat.messages.length - 1];
    const sender = await User.findById(lastMessage.sender).select('name profileImage');

    const messageWithSender = {
      ...lastMessage.toObject(),
      sender: {
        _id: sender._id,
        name: sender.name,
        profileImage: sender.profileImage
      }
    };

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: messageWithSender
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message'
    });
  }
});

// @desc    Mark messages as read
// @route   PUT /api/chats/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat'
      });
    }

    // Mark messages as read
    await chat.markAsRead(req.user._id);

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking messages as read'
    });
  }
});

// @desc    Delete message
// @route   DELETE /api/chats/:chatId/messages/:messageId
// @access  Private
router.delete('/:chatId/messages/:messageId', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat'
      });
    }

    const message = chat.messages.id(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    // Mark message as deleted
    message.isDeleted = true;
    message.deletedAt = new Date();
    await chat.save();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting message'
    });
  }
});

// @desc    Edit message
// @route   PUT /api/chats/:chatId/messages/:messageId
// @access  Private
router.put('/:chatId/messages/:messageId', protect, [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Message content must be between 1 and 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { content } = req.body;

    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat'
      });
    }

    const message = chat.messages.id(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this message'
      });
    }

    // Update message
    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await chat.save();

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: {
        message
      }
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while editing message'
    });
  }
});

// @desc    Get unread count
// @route   GET /api/chats/unread-count
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
      isActive: true
    });

    const totalUnread = chats.reduce((sum, chat) => {
      return sum + chat.getUnreadCount(req.user._id);
    }, 0);

    res.json({
      success: true,
      data: {
        unreadCount: totalUnread
      }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting unread count'
    });
  }
});

module.exports = router;
