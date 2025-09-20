const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Booking = require('../models/Booking');
const Hostel = require('../models/Hostel');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private (Student only)
router.post('/', protect, authorize('Student'), [
  body('hostelId').isMongoId().withMessage('Valid hostel ID is required'),
  body('roomType').isIn(['Single', 'Double', 'Triple', 'Quad']).withMessage('Valid room type is required'),
  body('checkInDate').isISO8601().withMessage('Valid check-in date is required'),
  body('checkOutDate').isISO8601().withMessage('Valid check-out date is required'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be at least 1 month'),
  body('emergencyContact.name').optional().isString().withMessage('Emergency contact name must be a string'),
  body('emergencyContact.phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Valid emergency contact phone is required'),
  body('emergencyContact.relationship').optional().isString().withMessage('Relationship must be a string'),
  body('specialRequests').optional().isString().withMessage('Special requests must be a string')
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

    const {
      hostelId,
      roomType,
      checkInDate,
      checkOutDate,
      duration,
      foodOptions,
      emergencyContact,
      specialRequests
    } = req.body;

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date cannot be in the past'
      });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      });
    }

    // Get hostel details
    const hostel = await Hostel.findById(hostelId).populate('owner');
    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    if (hostel.status !== 'Active' || !hostel.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Hostel is not available for booking'
      });
    }

    // Check room availability
    const roomInfo = hostel.rooms.find(room => room.type === roomType);
    if (!roomInfo || roomInfo.availableRooms <= 0) {
      return res.status(400).json({
        success: false,
        message: `No ${roomType} rooms available`
      });
    }

    // Check for existing active bookings
    const existingBooking = await Booking.findOne({
      student: req.user._id,
      status: { $in: ['Pending', 'Confirmed', 'Paid', 'CheckedIn', 'Active'] }
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active booking'
      });
    }

    // Calculate pricing
    const monthlyRent = hostel.pricing.monthlyRent;
    const securityDeposit = hostel.pricing.securityDeposit || 0;
    const maintenanceCharges = hostel.pricing.maintenanceCharges || 0;
    
    let totalAmount = (monthlyRent * duration) + securityDeposit + (maintenanceCharges * duration);
    
    // Add food cost if selected
    let foodCost = 0;
    if (foodOptions && foodOptions.selected && hostel.foodOptions.available) {
      foodCost = hostel.foodOptions.monthlyCost * duration;
      totalAmount += foodCost;
    }

    // Create booking
    const booking = new Booking({
      student: req.user._id,
      hostel: hostelId,
      owner: hostel.owner._id,
      roomType,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      duration,
      pricing: {
        monthlyRent,
        securityDeposit,
        maintenanceCharges,
        totalAmount
      },
      foodOptions: foodOptions && foodOptions.selected ? {
        selected: true,
        type: foodOptions.type || hostel.foodOptions.type,
        mealPlan: foodOptions.mealPlan || hostel.foodOptions.mealPlan,
        monthlyCost: hostel.foodOptions.monthlyCost
      } : { selected: false },
      emergencyContact,
      specialRequests
    });

    await booking.save();

    // Populate booking details for response
    await booking.populate([
      { path: 'hostel', select: 'name address images contactInfo' },
      { path: 'owner', select: 'name email phone' }
    ]);

    // Send notification to hostel owner (implement notification system)
    // TODO: Send email/SMS notification to owner

    res.status(201).json({
      success: true,
      message: 'Booking request created successfully',
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating booking'
    });
  }
});

// @desc    Get user bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
router.get('/my-bookings', protect, [
  query('status').optional().isString().withMessage('Status must be a string'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
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

    const { status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter based on user role
    const filter = {};
    if (req.user.role === 'Student') {
      filter.student = req.user._id;
    } else if (req.user.role === 'HostelOwner') {
      filter.owner = req.user._id;
    }

    if (status) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate('student', 'name email phone profileImage')
      .populate('hostel', 'name address images contactInfo')
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalBookings: total,
          hasNext: skip + bookings.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings'
    });
  }
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('student', 'name email phone profileImage university course')
      .populate('hostel', 'name description address images facilities contactInfo')
      .populate('owner', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user has access to this booking
    const hasAccess = booking.student._id.toString() === req.user._id.toString() ||
                     booking.owner._id.toString() === req.user._id.toString() ||
                     req.user.role === 'Admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.json({
      success: true,
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking'
    });
  }
});

// @desc    Confirm booking (Owner only)
// @route   PUT /api/bookings/:id/confirm
// @access  Private (HostelOwner only)
router.put('/:id/confirm', protect, authorize('HostelOwner'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('student', 'name email phone')
      .populate('hostel', 'name');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns the hostel
    if (booking.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm this booking'
      });
    }

    if (booking.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be confirmed in current status'
      });
    }

    booking.status = 'Confirmed';
    booking.confirmedAt = new Date();
    await booking.save();

    // Send notification to student
    // TODO: Send email/SMS notification to student

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while confirming booking'
    });
  }
});

// @desc    Reject booking (Owner only)
// @route   PUT /api/bookings/:id/reject
// @access  Private (HostelOwner only)
router.put('/:id/reject', protect, authorize('HostelOwner'), [
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

    const booking = await Booking.findById(req.params.id)
      .populate('student', 'name email phone')
      .populate('hostel', 'name');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns the hostel
    if (booking.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this booking'
      });
    }

    if (booking.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be rejected in current status'
      });
    }

    booking.status = 'Rejected';
    booking.cancellation = {
      reason: req.body.reason || 'Rejected by owner',
      cancelledBy: 'Owner'
    };
    booking.cancelledAt = new Date();
    await booking.save();

    // Send notification to student
    // TODO: Send email/SMS notification to student

    res.json({
      success: true,
      message: 'Booking rejected successfully',
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Reject booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rejecting booking'
    });
  }
});

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, [
  body('reason').notEmpty().withMessage('Cancellation reason is required')
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

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user can cancel this booking
    const canCancel = booking.student.toString() === req.user._id.toString() ||
                     booking.owner.toString() === req.user._id.toString() ||
                     req.user.role === 'Admin';

    if (!canCancel) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    if (!booking.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be cancelled in current status'
      });
    }

    // Calculate refund if payment was made
    let refundAmount = 0;
    if (booking.pricing.paidAmount > 0) {
      refundAmount = booking.calculateRefund();
    }

    booking.status = 'Cancelled';
    booking.cancellation = {
      reason: req.body.reason,
      cancelledBy: req.user.role,
      refundAmount,
      refundStatus: refundAmount > 0 ? 'Pending' : 'Not Applicable'
    };
    booking.cancelledAt = new Date();
    await booking.save();

    // Update hostel room availability
    const hostel = await Hostel.findById(booking.hostel);
    if (hostel) {
      const roomIndex = hostel.rooms.findIndex(room => room.type === booking.roomType);
      if (roomIndex !== -1) {
        hostel.rooms[roomIndex].availableRooms += 1;
        await hostel.save();
      }
    }

    // Process refund if applicable
    if (refundAmount > 0) {
      // TODO: Implement refund processing with payment gateway
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        booking,
        refundAmount
      }
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling booking'
    });
  }
});

// @desc    Create payment order
// @route   POST /api/bookings/:id/payment/create-order
// @access  Private (Student only)
router.post('/:id/payment/create-order', protect, authorize('Student'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking
    if (booking.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to make payment for this booking'
      });
    }

    if (booking.status !== 'Confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Booking must be confirmed before payment'
      });
    }

    if (booking.pricing.pendingAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending amount for this booking'
      });
    }

    // Create Razorpay order
    const options = {
      amount: booking.pricing.pendingAmount * 100, // Amount in paise
      currency: 'INR',
      receipt: `booking_${booking.bookingId}`,
      notes: {
        bookingId: booking.bookingId,
        studentId: req.user._id.toString(),
        hostelId: booking.hostel.toString()
      }
    };

    const order = await razorpay.orders.create(options);

    // Save order ID to booking
    booking.payment.razorpayOrderId = order.id;
    await booking.save();

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: booking.pricing.pendingAmount,
        currency: 'INR',
        bookingId: booking.bookingId
      }
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating payment order'
    });
  }
});

// @desc    Verify payment
// @route   POST /api/bookings/:id/payment/verify
// @access  Private (Student only)
router.post('/:id/payment/verify', protect, authorize('Student'), [
  body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
  body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
  body('razorpay_signature').notEmpty().withMessage('Signature is required')
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

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking
    if (booking.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to verify payment for this booking'
      });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Update booking with payment details
    booking.status = 'Paid';
    booking.pricing.paidAmount = booking.pricing.totalAmount;
    booking.pricing.pendingAmount = 0;
    booking.payment = {
      ...booking.payment,
      method: 'Online',
      transactionId: razorpay_payment_id,
      paymentDate: new Date(),
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    };
    booking.paidAt = new Date();

    await booking.save();

    // Update hostel room availability
    const hostel = await Hostel.findById(booking.hostel);
    if (hostel) {
      const roomIndex = hostel.rooms.findIndex(room => room.type === booking.roomType);
      if (roomIndex !== -1) {
        hostel.rooms[roomIndex].availableRooms -= 1;
        hostel.currentOccupancy += 1;
        await hostel.save();
      }
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying payment'
    });
  }
});

// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Private (HostelOwner, Admin only)
router.get('/stats', protect, authorize('HostelOwner', 'Admin'), async (req, res) => {
  try {
    const filter = {};
    
    // If hostel owner, filter by their hostels
    if (req.user.role === 'HostelOwner') {
      filter.owner = req.user._id;
    }

    const stats = await Booking.getBookingStats(filter);

    // Get additional statistics
    const totalBookings = await Booking.countDocuments(filter);
    const activeBookings = await Booking.countDocuments({ ...filter, status: 'Active' });
    const pendingBookings = await Booking.countDocuments({ ...filter, status: 'Pending' });

    // Calculate revenue
    const revenueStats = await Booking.aggregate([
      { $match: { ...filter, status: { $in: ['Paid', 'Active', 'Completed'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.paidAmount' },
          averageBookingValue: { $avg: '$pricing.totalAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalBookings,
          activeBookings,
          pendingBookings,
          totalRevenue: revenueStats[0]?.totalRevenue || 0,
          averageBookingValue: revenueStats[0]?.averageBookingValue || 0
        },
        statusBreakdown: stats
      }
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking statistics'
    });
  }
});

module.exports = router;
