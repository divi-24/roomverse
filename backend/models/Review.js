const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Rating details
  overallRating: {
    type: Number,
    required: [true, 'Overall rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  
  // Detailed ratings
  detailedRatings: {
    cleanliness: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    food: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    safety: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    facilities: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    valueForMoney: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    staff: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    }
  },
  
  // Review content
  title: {
    type: String,
    required: [true, 'Review title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  
  // Stay details
  stayDuration: {
    type: String,
    enum: ['Less than 1 month', '1-3 months', '3-6 months', '6-12 months', 'More than 1 year'],
    required: true
  },
  roomType: {
    type: String,
    enum: ['Single', 'Double', 'Triple', 'Quad'],
    required: true
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDate: Date,
  
  // Helpfulness
  helpfulVotes: {
    type: Number,
    default: 0
  },
  notHelpfulVotes: {
    type: Number,
    default: 0
  },
  
  // Owner response
  ownerResponse: {
    response: String,
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['Active', 'Hidden', 'Reported'],
    default: 'Active'
  },
  
  // Images (optional)
  images: [{
    url: String,
    caption: String
  }]
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ hostel: 1, user: 1 }, { unique: true }); // One review per user per hostel
reviewSchema.index({ hostel: 1, overallRating: -1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ createdAt: -1 });

// Pre-save middleware to update hostel ratings
reviewSchema.post('save', async function() {
  await this.constructor.updateHostelRatings(this.hostel);
});

// Pre-remove middleware to update hostel ratings
reviewSchema.post('remove', async function() {
  await this.constructor.updateHostelRatings(this.hostel);
});

// Static method to update hostel ratings
reviewSchema.statics.updateHostelRatings = async function(hostelId) {
  const reviews = await this.find({ hostel: hostelId, status: 'Active' });
  
  if (reviews.length === 0) {
    await mongoose.model('Hostel').findByIdAndUpdate(hostelId, {
      averageRating: 0,
      totalReviews: 0
    });
    return;
  }
  
  const totalRating = reviews.reduce((sum, review) => sum + review.overallRating, 0);
  const averageRating = totalRating / reviews.length;
  
  await mongoose.model('Hostel').findByIdAndUpdate(hostelId, {
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
    totalReviews: reviews.length
  });
};

// Method to get helpfulness percentage
reviewSchema.methods.getHelpfulnessPercentage = function() {
  const totalVotes = this.helpfulVotes + this.notHelpfulVotes;
  if (totalVotes === 0) return 0;
  return Math.round((this.helpfulVotes / totalVotes) * 100);
};

// Method to check if user can edit
reviewSchema.methods.canEdit = function(userId) {
  return this.user.toString() === userId.toString();
};

module.exports = mongoose.model('Review', reviewSchema);
