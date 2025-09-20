const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('currentHostel', 'name address')
      .select('-password');

    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid Indian phone number'),
  body('preferences.budget.min').optional().isFloat({ min: 0 }).withMessage('Min budget must be a positive number'),
  body('preferences.budget.max').optional().isFloat({ min: 0 }).withMessage('Max budget must be a positive number'),
  body('preferences.location.latitude').optional().isFloat().withMessage('Valid latitude is required'),
  body('preferences.location.longitude').optional().isFloat().withMessage('Valid longitude is required'),
  body('preferences.location.radius').optional().isFloat({ min: 0 }).withMessage('Radius must be a positive number')
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

    const allowedFields = ['name', 'phone', 'preferences', 'emergencyContacts', 'parentContact'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -verificationToken -resetPasswordToken -resetPasswordExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

// @desc    Search users
// @route   GET /api/users/search
// @access  Private
router.get('/search', protect, [
  body('q').optional().isString().withMessage('Search query must be a string'),
  body('role').optional().isIn(['Student', 'Parent', 'HostelOwner', 'Admin']).withMessage('Invalid role'),
  body('university').optional().isString().withMessage('University must be a string'),
  body('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  body('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
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

    const { q, role, university, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build search filter
    const filter = {};
    
    if (q) {
      const searchRegex = new RegExp(q, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { studentId: searchRegex }
      ];
    }

    if (role) filter.role = role;
    if (university) filter.university = new RegExp(university, 'i');

    const users = await User.find(filter)
      .select('-password -verificationToken -resetPasswordToken -resetPasswordExpire')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalUsers: total,
          hasNext: skip + users.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching users'
    });
  }
});

// @desc    Get students in same hostel
// @route   GET /api/users/hostel-mates
// @access  Private (Student only)
router.get('/hostel-mates', protect, authorize('Student'), async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    
    if (!currentUser.currentHostel) {
      return res.status(400).json({
        success: false,
        message: 'You are not currently staying in any hostel'
      });
    }

    const hostelMates = await User.find({
      _id: { $ne: req.user._id },
      currentHostel: currentUser.currentHostel,
      role: 'Student'
    })
    .select('-password -verificationToken -resetPasswordToken -resetPasswordExpire')
    .sort({ name: 1 });

    res.json({
      success: true,
      data: {
        hostelMates
      }
    });
  } catch (error) {
    console.error('Get hostel mates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching hostel mates'
    });
  }
});

// @desc    Update user location
// @route   PUT /api/users/location
// @access  Private
router.put('/location', protect, [
  body('latitude').isFloat().withMessage('Valid latitude is required'),
  body('longitude').isFloat().withMessage('Valid longitude is required'),
  body('address').optional().isString().withMessage('Address must be a string')
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

    const { latitude, longitude, address } = req.body;

    // Update user's last known location
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'preferences.location.latitude': latitude,
        'preferences.location.longitude': longitude,
        lastActive: new Date()
      },
      { new: true }
    ).select('-password');

    // Emit location update via Socket.IO if user is in a hostel
    if (user.currentHostel) {
      const io = req.app.get('io');
      if (io) {
        io.to(`hostel-${user.currentHostel}`).emit('location-update', {
          userId: user._id,
          location: {
            latitude,
            longitude,
            address,
            timestamp: new Date()
          }
        });
      }
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        location: {
          latitude,
          longitude,
          address
        }
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating location'
    });
  }
});

// @desc    Send panic alert
// @route   POST /api/users/panic-alert
// @access  Private
router.post('/panic-alert', protect, [
  body('latitude').isFloat().withMessage('Valid latitude is required'),
  body('longitude').isFloat().withMessage('Valid longitude is required'),
  body('address').optional().isString().withMessage('Address must be a string'),
  body('message').optional().isString().withMessage('Message must be a string')
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

    const { latitude, longitude, address, message } = req.body;

    const user = await User.findById(req.user._id).populate('currentHostel');

    if (!user.currentHostel) {
      return res.status(400).json({
        success: false,
        message: 'You must be staying in a hostel to send panic alerts'
      });
    }

    // Emit panic alert via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`hostel-${user.currentHostel._id}`).emit('panic-alert', {
        userId: user._id,
        location: {
          latitude,
          longitude,
          address,
          timestamp: new Date()
        },
        message: message || 'Emergency! Help needed!'
      });
    }

    // Send notifications to emergency contacts
    if (user.emergencyContacts && user.emergencyContacts.length > 0) {
      // In a real app, you would send SMS/email to emergency contacts
      console.log('Sending panic alert to emergency contacts:', user.emergencyContacts);
    }

    // Send notification to hostel owner
    const Notification = require('../models/Notification');
    await Notification.createNotification({
      recipient: user.currentHostel.owner,
      type: 'panic_alert',
      title: '🚨 PANIC ALERT',
      message: `${user.name} has sent a panic alert from ${user.currentHostel.name}`,
      relatedEntity: {
        type: 'user',
        id: user._id
      },
      data: {
        location: {
          latitude,
          longitude,
          address
        },
        message: message || 'Emergency! Help needed!'
      },
      priority: 'urgent',
      channels: {
        inApp: true,
        email: true,
        sms: true,
        push: true
      }
    });

    res.json({
      success: true,
      message: 'Panic alert sent successfully',
      data: {
        alertId: Date.now(), // In a real app, you would generate a proper alert ID
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Send panic alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending panic alert'
    });
  }
});

// @desc    Send "I'll be late" notification
// @route   POST /api/users/late-notification
// @access  Private
router.post('/late-notification', protect, [
  body('expectedTime').isISO8601().withMessage('Valid expected time is required'),
  body('reason').optional().isString().withMessage('Reason must be a string')
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

    const { expectedTime, reason } = req.body;

    const user = await User.findById(req.user._id).populate('currentHostel');

    if (!user.currentHostel) {
      return res.status(400).json({
        success: false,
        message: 'You must be staying in a hostel to send late notifications'
      });
    }

    // Send notification to hostel owner
    const Notification = require('../models/Notification');
    await Notification.createNotification({
      recipient: user.currentHostel.owner,
      type: 'late_notification',
      title: 'Late Arrival Notification',
      message: `${user.name} will be arriving late at ${user.currentHostel.name}`,
      relatedEntity: {
        type: 'user',
        id: user._id
      },
      data: {
        expectedTime: new Date(expectedTime),
        reason: reason || 'No reason provided'
      },
      channels: {
        inApp: true,
        email: true,
        sms: false,
        push: true
      }
    });

    // Send notification to parent if contact info is available
    if (user.parentContact && user.parentContact.email) {
      await Notification.createNotification({
        recipient: user.parentContact.email, // In a real app, you'd find the parent user by email
        type: 'late_notification',
        title: 'Your child will be arriving late',
        message: `${user.name} will be arriving late at their hostel`,
        relatedEntity: {
          type: 'user',
          id: user._id
        },
        data: {
          expectedTime: new Date(expectedTime),
          reason: reason || 'No reason provided'
        },
        channels: {
          inApp: false,
          email: true,
          sms: false,
          push: false
        }
      });
    }

    res.json({
      success: true,
      message: 'Late notification sent successfully',
      data: {
        expectedTime: new Date(expectedTime),
        reason
      }
    });
  } catch (error) {
    console.error('Send late notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending late notification'
    });
  }
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Get basic stats
    const stats = {
      profileCompletion: 0,
      totalReviews: 0,
      totalBookings: 0,
      totalMessages: 0,
      joinedDate: user.createdAt,
      lastActive: user.lastActive
    };

    // Calculate profile completion
    let completedFields = 0;
    const totalFields = 8; // Adjust based on your requirements

    if (user.name) completedFields++;
    if (user.email) completedFields++;
    if (user.phone) completedFields++;
    if (user.profileImage) completedFields++;
    if (user.preferences && user.preferences.budget) completedFields++;
    if (user.emergencyContacts && user.emergencyContacts.length > 0) completedFields++;
    if (user.role === 'Student' && user.university) completedFields++;
    if (user.role === 'Student' && user.course) completedFields++;

    stats.profileCompletion = Math.round((completedFields / totalFields) * 100);

    // Get additional stats based on role
    if (user.role === 'Student') {
      // Get review count
      const Review = require('../models/Review');
      stats.totalReviews = await Review.countDocuments({ user: user._id });
    }

    res.json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user statistics'
    });
  }
});

module.exports = router;
