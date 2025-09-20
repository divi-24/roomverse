const express = require('express');
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Hostel = require('../models/Hostel');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get reviews for a hostel
// @route   GET /api/reviews/hostel/:hostelId
// @access  Public
router.get('/hostel/:hostelId', async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const reviews = await Review.find({ 
      hostel: req.params.hostelId, 
      status: 'Active' 
    })
    .populate('user', 'name profileImage')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Review.countDocuments({ 
      hostel: req.params.hostelId, 
      status: 'Active' 
    });

    // Get rating statistics
    const ratingStats = await Review.aggregate([
      { $match: { hostel: req.params.hostelId, status: 'Active' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$overallRating' },
          totalReviews: { $sum: 1 },
          ratingBreakdown: {
            $push: {
              rating: '$overallRating',
              cleanliness: '$detailedRatings.cleanliness',
              food: '$detailedRatings.food',
              safety: '$detailedRatings.safety',
              facilities: '$detailedRatings.facilities',
              valueForMoney: '$detailedRatings.valueForMoney',
              staff: '$detailedRatings.staff'
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        ratingStats: ratingStats[0] || {
          averageRating: 0,
          totalReviews: 0,
          ratingBreakdown: []
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalReviews: total,
          hasNext: skip + reviews.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews'
    });
  }
});

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private (Student only)
router.post('/', protect, authorize('Student'), [
  body('hostel').isMongoId().withMessage('Valid hostel ID is required'),
  body('overallRating').isInt({ min: 1, max: 5 }).withMessage('Overall rating must be between 1 and 5'),
  body('detailedRatings.cleanliness').isInt({ min: 1, max: 5 }).withMessage('Cleanliness rating must be between 1 and 5'),
  body('detailedRatings.food').isInt({ min: 1, max: 5 }).withMessage('Food rating must be between 1 and 5'),
  body('detailedRatings.safety').isInt({ min: 1, max: 5 }).withMessage('Safety rating must be between 1 and 5'),
  body('detailedRatings.facilities').isInt({ min: 1, max: 5 }).withMessage('Facilities rating must be between 1 and 5'),
  body('detailedRatings.valueForMoney').isInt({ min: 1, max: 5 }).withMessage('Value for money rating must be between 1 and 5'),
  body('detailedRatings.staff').isInt({ min: 1, max: 5 }).withMessage('Staff rating must be between 1 and 5'),
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('comment').trim().isLength({ min: 10, max: 1000 }).withMessage('Comment must be between 10 and 1000 characters'),
  body('stayDuration').isIn(['Less than 1 month', '1-3 months', '3-6 months', '6-12 months', 'More than 1 year']).withMessage('Invalid stay duration'),
  body('roomType').isIn(['Single', 'Double', 'Triple', 'Quad']).withMessage('Invalid room type')
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

    // Check if hostel exists
    const hostel = await Hostel.findById(req.body.hostel);
    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    // Check if user has already reviewed this hostel
    const existingReview = await Review.findOne({
      hostel: req.body.hostel,
      user: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this hostel'
      });
    }

    // Create review
    const reviewData = {
      ...req.body,
      user: req.user._id
    };

    const review = await Review.create(reviewData);

    // Populate the review with user data
    await review.populate('user', 'name profileImage');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: {
        review
      }
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating review'
    });
  }
});

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private (Student only - own review)
router.put('/:id', protect, authorize('Student'), [
  body('overallRating').optional().isInt({ min: 1, max: 5 }).withMessage('Overall rating must be between 1 and 5'),
  body('detailedRatings.cleanliness').optional().isInt({ min: 1, max: 5 }).withMessage('Cleanliness rating must be between 1 and 5'),
  body('detailedRatings.food').optional().isInt({ min: 1, max: 5 }).withMessage('Food rating must be between 1 and 5'),
  body('detailedRatings.safety').optional().isInt({ min: 1, max: 5 }).withMessage('Safety rating must be between 1 and 5'),
  body('detailedRatings.facilities').optional().isInt({ min: 1, max: 5 }).withMessage('Facilities rating must be between 1 and 5'),
  body('detailedRatings.valueForMoney').optional().isInt({ min: 1, max: 5 }).withMessage('Value for money rating must be between 1 and 5'),
  body('detailedRatings.staff').optional().isInt({ min: 1, max: 5 }).withMessage('Staff rating must be between 1 and 5'),
  body('title').optional().trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('comment').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('Comment must be between 10 and 1000 characters')
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

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    // Update review
    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      { ...req.body, isEdited: true, editedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('user', 'name profileImage');

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: {
        review: updatedReview
      }
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating review'
    });
  }
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Student only - own review)
router.delete('/:id', protect, authorize('Student'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting review'
    });
  }
});

// @desc    Get user's reviews
// @route   GET /api/reviews/my-reviews
// @access  Private (Student only)
router.get('/my-reviews', protect, authorize('Student'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find({ user: req.user._id })
      .populate('hostel', 'name address images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalReviews: total,
          hasNext: skip + reviews.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews'
    });
  }
});

// @desc    Vote on review helpfulness
// @route   POST /api/reviews/:id/vote
// @access  Private
router.post('/:id/vote', protect, [
  body('helpful').isBoolean().withMessage('Helpful must be a boolean value')
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

    const { helpful } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user has already voted (this would need a separate votes collection in a real app)
    // For now, we'll just update the counts
    if (helpful) {
      review.helpfulVotes += 1;
    } else {
      review.notHelpfulVotes += 1;
    }

    await review.save();

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        helpfulVotes: review.helpfulVotes,
        notHelpfulVotes: review.notHelpfulVotes
      }
    });
  } catch (error) {
    console.error('Vote on review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while recording vote'
    });
  }
});

// @desc    Respond to review (Hostel Owner)
// @route   POST /api/reviews/:id/respond
// @access  Private (HostelOwner only)
router.post('/:id/respond', protect, authorize('HostelOwner'), [
  body('response').trim().isLength({ min: 10, max: 500 }).withMessage('Response must be between 10 and 500 characters')
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

    const { response } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if the hostel owner owns the hostel being reviewed
    const hostel = await Hostel.findById(review.hostel);
    if (!hostel || hostel.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this review'
      });
    }

    // Check if already responded
    if (review.ownerResponse && review.ownerResponse.response) {
      return res.status(400).json({
        success: false,
        message: 'You have already responded to this review'
      });
    }

    // Add response
    review.ownerResponse = {
      response,
      respondedAt: new Date(),
      respondedBy: req.user._id
    };

    await review.save();

    res.json({
      success: true,
      message: 'Response added successfully',
      data: {
        review
      }
    });
  } catch (error) {
    console.error('Respond to review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding response'
    });
  }
});

module.exports = router;
