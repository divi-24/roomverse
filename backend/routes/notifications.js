const express = require('express');
const { body, validationResult } = require('express-validator');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, priority, isRead } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = { recipient: req.user._id };
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const notifications = await Notification.find(filter)
      .populate('sender', 'name profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalNotifications: total,
          hasNext: skip + notifications.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications'
    });
  }
});

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({
      success: true,
      data: {
        unreadCount
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

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns the notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this notification'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking notification as read'
    });
  }
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user._id);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking all notifications as read'
    });
  }
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns the notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting notification'
    });
  }
});

// @desc    Create notification (for testing/admin purposes)
// @route   POST /api/notifications
// @access  Private
router.post('/', protect, [
  body('recipient').isMongoId().withMessage('Valid recipient ID is required'),
  body('type').isIn([
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
  ]).withMessage('Invalid notification type'),
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
  body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Message must be between 1 and 500 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority level')
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

    const notificationData = {
      ...req.body,
      sender: req.user._id
    };

    const notification = await Notification.createNotification(notificationData);

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: {
        notification
      }
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating notification'
    });
  }
});

// @desc    Get notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
router.get('/preferences', protect, async (req, res) => {
  try {
    // In a real app, you would have a UserPreferences model
    // For now, we'll return default preferences
    const preferences = {
      inApp: true,
      email: true,
      sms: false,
      push: true,
      types: {
        booking_request: { inApp: true, email: true, sms: false, push: true },
        booking_approved: { inApp: true, email: true, sms: true, push: true },
        booking_rejected: { inApp: true, email: true, sms: false, push: true },
        payment_success: { inApp: true, email: true, sms: false, push: true },
        payment_failed: { inApp: true, email: true, sms: true, push: true },
        review_added: { inApp: true, email: true, sms: false, push: false },
        message_received: { inApp: true, email: false, sms: false, push: true },
        panic_alert: { inApp: true, email: true, sms: true, push: true },
        late_notification: { inApp: true, email: true, sms: true, push: true },
        location_shared: { inApp: true, email: false, sms: false, push: false },
        complaint_raised: { inApp: true, email: true, sms: false, push: true },
        complaint_resolved: { inApp: true, email: true, sms: false, push: true },
        hostel_verified: { inApp: true, email: true, sms: false, push: true },
        hostel_rejected: { inApp: true, email: true, sms: false, push: true },
        maintenance_request: { inApp: true, email: true, sms: false, push: true },
        announcement: { inApp: true, email: true, sms: false, push: true },
        system_alert: { inApp: true, email: true, sms: true, push: true }
      }
    };

    res.json({
      success: true,
      data: {
        preferences
      }
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notification preferences'
    });
  }
});

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
router.put('/preferences', protect, [
  body('inApp').optional().isBoolean().withMessage('inApp must be a boolean'),
  body('email').optional().isBoolean().withMessage('email must be a boolean'),
  body('sms').optional().isBoolean().withMessage('sms must be a boolean'),
  body('push').optional().isBoolean().withMessage('push must be a boolean'),
  body('types').optional().isObject().withMessage('types must be an object')
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

    // In a real app, you would update the UserPreferences model
    // For now, we'll just return success

    res.json({
      success: true,
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating notification preferences'
    });
  }
});

module.exports = router;
