const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Basic booking information
  bookingId: {
    type: String,
    unique: true,
    required: true
  },
  
  // References
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    required: [true, 'Hostel is required']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },
  
  // Booking details
  roomType: {
    type: String,
    enum: ['Single', 'Double', 'Triple', 'Quad'],
    required: [true, 'Room type is required']
  },
  checkInDate: {
    type: Date,
    required: [true, 'Check-in date is required']
  },
  checkOutDate: {
    type: Date,
    required: [true, 'Check-out date is required']
  },
  duration: {
    type: Number, // in months
    required: [true, 'Duration is required'],
    min: [1, 'Minimum duration is 1 month']
  },
  
  // Pricing details
  pricing: {
    monthlyRent: {
      type: Number,
      required: [true, 'Monthly rent is required'],
      min: [0, 'Rent cannot be negative']
    },
    securityDeposit: {
      type: Number,
      default: 0,
      min: [0, 'Security deposit cannot be negative']
    },
    maintenanceCharges: {
      type: Number,
      default: 0,
      min: [0, 'Maintenance charges cannot be negative']
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative']
    },
    pendingAmount: {
      type: Number,
      default: 0,
      min: [0, 'Pending amount cannot be negative']
    }
  },
  
  // Food options (if selected)
  foodOptions: {
    selected: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['Veg', 'Non-Veg', 'Both'],
      default: 'Veg'
    },
    mealPlan: {
      type: String,
      enum: ['Breakfast Only', 'Lunch Only', 'Dinner Only', 'Breakfast + Dinner', 'All Meals'],
      default: 'All Meals'
    },
    monthlyCost: {
      type: Number,
      default: 0,
      min: [0, 'Food cost cannot be negative']
    }
  },
  
  // Status tracking
  status: {
    type: String,
    enum: [
      'Pending',           // Initial booking request
      'Confirmed',         // Owner confirmed the booking
      'Paid',             // Payment completed
      'CheckedIn',        // Student has checked in
      'Active',           // Currently staying
      'CheckedOut',       // Student has checked out
      'Completed',        // Booking completed successfully
      'Cancelled',        // Cancelled by student
      'Rejected',         // Rejected by owner
      'Expired'           // Booking expired
    ],
    default: 'Pending'
  },
  
  // Payment information
  payment: {
    method: {
      type: String,
      enum: ['Online', 'Cash', 'Bank Transfer', 'UPI'],
      default: 'Online'
    },
    transactionId: String,
    paymentDate: Date,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String
  },
  
  // Additional information
  specialRequests: String,
  notes: String,
  
  // Important dates
  confirmedAt: Date,
  paidAt: Date,
  checkedInAt: Date,
  checkedOutAt: Date,
  cancelledAt: Date,
  
  // Cancellation details
  cancellation: {
    reason: String,
    cancelledBy: {
      type: String,
      enum: ['Student', 'Owner', 'Admin']
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: [0, 'Refund amount cannot be negative']
    },
    refundStatus: {
      type: String,
      enum: ['Pending', 'Processed', 'Failed', 'Not Applicable'],
      default: 'Not Applicable'
    }
  },
  
  // Reviews and ratings (after checkout)
  review: {
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5']
    },
    comment: String,
    reviewDate: Date
  },
  
  // Emergency contact during stay
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bookingSchema.index({ student: 1, status: 1 });
bookingSchema.index({ hostel: 1, status: 1 });
bookingSchema.index({ owner: 1, status: 1 });
bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });

// Generate unique booking ID
bookingSchema.pre('save', async function(next) {
  if (!this.bookingId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    this.bookingId = `RV${year}${month}${day}${random}`;
  }
  
  // Calculate pending amount
  this.pricing.pendingAmount = this.pricing.totalAmount - this.pricing.paidAmount;
  
  next();
});

// Virtual for booking duration in days
bookingSchema.virtual('durationInDays').get(function() {
  if (this.checkInDate && this.checkOutDate) {
    const diffTime = Math.abs(this.checkOutDate - this.checkInDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for booking status display
bookingSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'Pending': 'Awaiting Confirmation',
    'Confirmed': 'Confirmed - Payment Pending',
    'Paid': 'Payment Completed',
    'CheckedIn': 'Checked In',
    'Active': 'Currently Staying',
    'CheckedOut': 'Checked Out',
    'Completed': 'Completed',
    'Cancelled': 'Cancelled',
    'Rejected': 'Rejected',
    'Expired': 'Expired'
  };
  return statusMap[this.status] || this.status;
});

// Method to check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function() {
  const cancellableStatuses = ['Pending', 'Confirmed', 'Paid'];
  return cancellableStatuses.includes(this.status);
};

// Method to check if booking can be modified
bookingSchema.methods.canBeModified = function() {
  const modifiableStatuses = ['Pending', 'Confirmed'];
  return modifiableStatuses.includes(this.status);
};

// Method to calculate refund amount
bookingSchema.methods.calculateRefund = function() {
  const now = new Date();
  const checkInDate = new Date(this.checkInDate);
  const daysUntilCheckIn = Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24));
  
  let refundPercentage = 0;
  
  if (daysUntilCheckIn > 30) {
    refundPercentage = 0.9; // 90% refund
  } else if (daysUntilCheckIn > 15) {
    refundPercentage = 0.7; // 70% refund
  } else if (daysUntilCheckIn > 7) {
    refundPercentage = 0.5; // 50% refund
  } else if (daysUntilCheckIn > 0) {
    refundPercentage = 0.2; // 20% refund
  }
  
  return Math.floor(this.pricing.paidAmount * refundPercentage);
};

// Static method to get booking statistics
bookingSchema.statics.getBookingStats = async function(filter = {}) {
  const stats = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$pricing.totalAmount' },
        paidAmount: { $sum: '$pricing.paidAmount' }
      }
    }
  ]);
  
  return stats;
};

module.exports = mongoose.model('Booking', bookingSchema);
