const express = require('express');
const { body, validationResult } = require('express-validator');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Notification = require('../models/Notification');

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create payment order
// @route   POST /api/payments/create-order
// @access  Private
router.post('/create-order', protect, [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('currency').optional().isIn(['INR', 'USD']).withMessage('Currency must be INR or USD'),
  body('hostelId').isMongoId().withMessage('Valid hostel ID is required'),
  body('paymentType').isIn(['booking', 'rent', 'security_deposit', 'maintenance']).withMessage('Invalid payment type'),
  body('description').optional().isString().withMessage('Description must be a string')
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
      amount, 
      currency = 'INR', 
      hostelId, 
      paymentType, 
      description 
    } = req.body;

    // Verify hostel exists
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: `receipt_${Date.now()}_${req.user._id}`,
      notes: {
        userId: req.user._id.toString(),
        hostelId: hostelId,
        paymentType,
        description: description || `${paymentType} payment for ${hostel.name}`
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order'
    });
  }
});

// @desc    Verify payment
// @route   POST /api/payments/verify
// @access  Private
router.post('/verify', protect, [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('signature').notEmpty().withMessage('Signature is required')
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

    const { orderId, paymentId, signature } = req.body;

    // Verify payment signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Get payment details from Razorpay
    const payment = await razorpay.payments.fetch(paymentId);
    const order = await razorpay.orders.fetch(orderId);

    // Verify payment status
    if (payment.status !== 'captured') {
      return res.status(400).json({
        success: false,
        message: 'Payment not captured'
      });
    }

    // Create payment record in database
    const paymentRecord = {
      userId: req.user._id,
      hostelId: order.notes.hostelId,
      orderId: orderId,
      paymentId: paymentId,
      amount: payment.amount / 100, // Convert from paise
      currency: payment.currency,
      status: 'completed',
      paymentType: order.notes.paymentType,
      description: order.notes.description,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      paymentMethod: payment.method,
      paymentDetails: {
        cardId: payment.card_id,
        bank: payment.bank,
        wallet: payment.wallet,
        vpa: payment.vpa
      }
    };

    // Save payment record (you would create a Payment model for this)
    // For now, we'll just return success

    // Send notification to hostel owner
    const hostel = await Hostel.findById(order.notes.hostelId).populate('owner');
    if (hostel && hostel.owner) {
      await Notification.createNotification({
        recipient: hostel.owner._id,
        type: 'payment_success',
        title: 'Payment Received',
        message: `Payment of ₹${paymentRecord.amount} received from ${req.user.name} for ${hostel.name}`,
        relatedEntity: {
          type: 'payment',
          id: paymentId
        },
        data: {
          amount: paymentRecord.amount,
          currency: paymentRecord.currency,
          transactionId: paymentId,
          hostelName: hostel.name
        },
        channels: {
          inApp: true,
          email: true
        }
      });
    }

    // Send notification to user
    await Notification.createNotification({
      recipient: req.user._id,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Your payment of ₹${paymentRecord.amount} for ${hostel.name} has been processed successfully`,
      relatedEntity: {
        type: 'payment',
        id: paymentId
      },
      data: {
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        transactionId: paymentId,
        hostelName: hostel.name
      },
      channels: {
        inApp: true,
        email: true
      }
    });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: paymentId,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        status: 'completed'
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

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, paymentType } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = { userId: req.user._id };
    if (paymentType) {
      filter.paymentType = paymentType;
    }

    // In a real app, you would query from a Payment model
    // For now, we'll return a placeholder response
    const payments = []; // await Payment.find(filter).populate('hostel', 'name').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = 0; // await Payment.countDocuments(filter);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalPayments: total,
          hasNext: skip + payments.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching payment history'
    });
  }
});

// @desc    Get payment details
// @route   GET /api/payments/:paymentId
// @access  Private
router.get('/:paymentId', protect, async (req, res) => {
  try {
    // In a real app, you would query from a Payment model
    // For now, we'll fetch from Razorpay
    const payment = await razorpay.payments.fetch(req.params.paymentId);

    // Check if user owns this payment
    if (payment.notes && payment.notes.userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.json({
      success: true,
      data: {
        payment: {
          id: payment.id,
          amount: payment.amount / 100,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          description: payment.description,
          createdAt: new Date(payment.created_at * 1000),
          capturedAt: payment.captured_at ? new Date(payment.captured_at * 1000) : null
        }
      }
    });
  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching payment details'
    });
  }
});

// @desc    Refund payment
// @route   POST /api/payments/:paymentId/refund
// @access  Private (HostelOwner only)
router.post('/:paymentId/refund', protect, authorize('HostelOwner'), [
  body('amount').optional().isFloat({ min: 1 }).withMessage('Refund amount must be greater than 0'),
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

    const { amount, reason = 'Refund requested' } = req.body;

    // Get payment details
    const payment = await razorpay.payments.fetch(req.params.paymentId);

    // Verify hostel owner owns the hostel
    const hostel = await Hostel.findById(payment.notes.hostelId);
    if (!hostel || hostel.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to refund this payment'
      });
    }

    // Create refund
    const refundOptions = {
      payment_id: req.params.paymentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Partial refund if amount specified
      notes: {
        reason,
        refundedBy: req.user._id.toString(),
        hostelId: payment.notes.hostelId
      }
    };

    const refund = await razorpay.payments.refund(req.params.paymentId, refundOptions);

    // Send notification to user
    await Notification.createNotification({
      recipient: payment.notes.userId,
      type: 'payment_refund',
      title: 'Payment Refunded',
      message: `Your payment of ₹${payment.amount / 100} has been refunded for ${hostel.name}`,
      relatedEntity: {
        type: 'payment',
        id: req.params.paymentId
      },
      data: {
        amount: payment.amount / 100,
        refundAmount: refund.amount / 100,
        reason,
        hostelName: hostel.name
      },
      channels: {
        inApp: true,
        email: true
      }
    });

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing refund'
    });
  }
});

// @desc    Get Razorpay key
// @route   GET /api/payments/key
// @access  Public
router.get('/key', (req, res) => {
  res.json({
    success: true,
    data: {
      keyId: process.env.RAZORPAY_KEY_ID
    }
  });
});

module.exports = router;
