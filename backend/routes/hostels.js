const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Hostel = require('../models/Hostel');
const User = require('../models/User');
const Review = require('../models/Review');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { calculateDistance } = require('../utils/auth');
const { uploadMultiple, deleteImage, getOptimizedImageUrl } = require('../middleware/upload');

const router = express.Router();

// @desc    Get all hostels with filters
// @route   GET /api/hostels
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('city').optional().isString().withMessage('City must be a string'),
  query('state').optional().isString().withMessage('State must be a string'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
  query('facilities').optional().isString().withMessage('Facilities must be a string'),
  query('foodAvailable').optional().isBoolean().withMessage('Food available must be a boolean'),
  query('latitude').optional().isFloat().withMessage('Latitude must be a number'),
  query('longitude').optional().isFloat().withMessage('Longitude must be a number'),
  query('radius').optional().isFloat({ min: 0 }).withMessage('Radius must be a positive number'),
  query('sortBy').optional().isIn(['price', 'rating', 'distance', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
], optionalAuth, async (req, res) => {
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
      page = 1,
      limit = 10,
      city,
      state,
      minPrice,
      maxPrice,
      facilities,
      foodAvailable,
      latitude,
      longitude,
      radius = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {
      status: 'Active',
      isVerified: true
    };

    // Location filters
    if (city) filter['address.city'] = new RegExp(city, 'i');
    if (state) filter['address.state'] = new RegExp(state, 'i');

    // Price filters
    if (minPrice || maxPrice) {
      filter['pricing.monthlyRent'] = {};
      if (minPrice) filter['pricing.monthlyRent'].$gte = parseFloat(minPrice);
      if (maxPrice) filter['pricing.monthlyRent'].$lte = parseFloat(maxPrice);
    }

    // Food availability filter
    if (foodAvailable !== undefined) {
      filter['foodOptions.available'] = foodAvailable === 'true';
    }

    // Facilities filter
    if (facilities) {
      const facilityArray = facilities.split(',').map(f => f.trim());
      filter.$or = facilityArray.map(facility => ({
        [`facilities.${facility}`]: true
      }));
    }

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    let hostels = await Hostel.find(filter)
      .populate('owner', 'name email phone')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Apply location-based filtering if coordinates provided
    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);
      const radiusKm = parseFloat(radius);

      hostels = hostels.filter(hostel => {
        const distance = calculateDistance(
          userLat,
          userLng,
          hostel.address.coordinates.latitude,
          hostel.address.coordinates.longitude
        );
        return distance <= radiusKm;
      });

      // Add distance to each hostel
      hostels = hostels.map(hostel => {
        const distance = calculateDistance(
          userLat,
          userLng,
          hostel.address.coordinates.latitude,
          hostel.address.coordinates.longitude
        );
        return {
          ...hostel.toObject(),
          distance: Math.round(distance * 10) / 10 // Round to 1 decimal place
        };
      });

      // Re-sort by distance if location-based search
      if (sortBy === 'distance') {
        hostels.sort((a, b) => a.distance - b.distance);
      }
    }

    // Get total count for pagination
    const total = await Hostel.countDocuments(filter);

    res.json({
      success: true,
      data: {
        hostels,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalHostels: total,
          hasNext: skip + hostels.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get hostels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching hostels'
    });
  }
});

// @desc    Get single hostel
// @route   GET /api/hostels/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id)
      .populate('owner', 'name email phone profileImage')
      .populate('reviews');

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    // Get recent reviews
    const reviews = await Review.find({ hostel: req.params.id, status: 'Active' })
      .populate('user', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate rating breakdown
    const ratingBreakdown = await Review.aggregate([
      { $match: { hostel: hostel._id, status: 'Active' } },
      {
        $group: {
          _id: '$overallRating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        hostel,
        reviews,
        ratingBreakdown
      }
    });
  } catch (error) {
    console.error('Get hostel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching hostel'
    });
  }
});

// @desc    Create new hostel
// @route   POST /api/hostels
// @access  Private (HostelOwner only)
router.post('/', protect, authorize('HostelOwner'), [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('address.street').notEmpty().withMessage('Street address is required'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.state').notEmpty().withMessage('State is required'),
  body('address.pincode').matches(/^\d{6}$/).withMessage('Pincode must be 6 digits'),
  body('address.coordinates.latitude').isFloat().withMessage('Valid latitude is required'),
  body('address.coordinates.longitude').isFloat().withMessage('Valid longitude is required'),
  body('pricing.monthlyRent').isFloat({ min: 0 }).withMessage('Monthly rent must be a positive number'),
  body('pricing.securityDeposit').optional().isFloat({ min: 0 }).withMessage('Security deposit must be a positive number'),
  body('pricing.maintenanceCharges').optional().isFloat({ min: 0 }).withMessage('Maintenance charges must be a positive number'),
  body('contactInfo.phone').matches(/^[6-9]\d{9}$/).withMessage('Valid phone number is required'),
  body('contactInfo.email').isEmail().withMessage('Valid email is required'),
  body('totalCapacity').isInt({ min: 1 }).withMessage('Total capacity must be at least 1')
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

    // Add owner to request body
    req.body.owner = req.user._id;

    const hostel = await Hostel.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Hostel created successfully',
      data: {
        hostel
      }
    });
  } catch (error) {
    console.error('Create hostel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating hostel'
    });
  }
});

// @desc    Update hostel
// @route   PUT /api/hostels/:id
// @access  Private (HostelOwner only)
router.put('/:id', protect, authorize('HostelOwner'), [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('pricing.monthlyRent').optional().isFloat({ min: 0 }).withMessage('Monthly rent must be a positive number'),
  body('pricing.securityDeposit').optional().isFloat({ min: 0 }).withMessage('Security deposit must be a positive number'),
  body('pricing.maintenanceCharges').optional().isFloat({ min: 0 }).withMessage('Maintenance charges must be a positive number')
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

    let hostel = await Hostel.findById(req.params.id);

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    // Check if user owns the hostel
    if (hostel.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this hostel'
      });
    }

    hostel = await Hostel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Hostel updated successfully',
      data: {
        hostel
      }
    });
  } catch (error) {
    console.error('Update hostel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating hostel'
    });
  }
});

// @desc    Delete hostel
// @route   DELETE /api/hostels/:id
// @access  Private (HostelOwner only)
router.delete('/:id', protect, authorize('HostelOwner'), async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id);

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    // Check if user owns the hostel
    if (hostel.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this hostel'
      });
    }

    await Hostel.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Hostel deleted successfully'
    });
  } catch (error) {
    console.error('Delete hostel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting hostel'
    });
  }
});

// @desc    Get hostels by owner
// @route   GET /api/hostels/owner/my-hostels
// @access  Private (HostelOwner only)
router.get('/owner/my-hostels', protect, authorize('HostelOwner'), async (req, res) => {
  try {
    const hostels = await Hostel.find({ owner: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        hostels
      }
    });
  } catch (error) {
    console.error('Get owner hostels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching hostels'
    });
  }
});

// @desc    Upload hostel images
// @route   POST /api/hostels/:id/images
// @access  Private (HostelOwner only)
router.post('/:id/images', protect, authorize('HostelOwner'), uploadMultiple('images', 10), async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id);

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    // Check if user owns the hostel
    if (hostel.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this hostel'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }

    // Process uploaded images
    const newImages = req.files.map((file, index) => ({
      url: file.path || file.secure_url,
      caption: req.body.captions ? req.body.captions[index] : '',
      isPrimary: index === 0 && hostel.images.length === 0 // First image is primary if no existing images
    }));

    // Add new images to hostel
    hostel.images.push(...newImages);
    await hostel.save();

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      data: {
        images: newImages,
        totalImages: hostel.images.length
      }
    });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading images'
    });
  }
});

// @desc    Delete hostel image
// @route   DELETE /api/hostels/:id/images/:imageId
// @access  Private (HostelOwner only)
router.delete('/:id/images/:imageId', protect, authorize('HostelOwner'), async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id);

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    // Check if user owns the hostel
    if (hostel.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this hostel'
      });
    }

    const imageIndex = hostel.images.findIndex(img => img._id.toString() === req.params.imageId);
    
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const imageToDelete = hostel.images[imageIndex];
    
    // Delete from Cloudinary if using cloud storage
    try {
      if (imageToDelete.url.includes('cloudinary')) {
        const publicId = imageToDelete.url.split('/').pop().split('.')[0];
        await deleteImage(publicId);
      }
    } catch (cloudinaryError) {
      console.error('Error deleting from Cloudinary:', cloudinaryError);
    }

    // Remove image from array
    hostel.images.splice(imageIndex, 1);

    // If deleted image was primary and there are other images, make first one primary
    if (imageToDelete.isPrimary && hostel.images.length > 0) {
      hostel.images[0].isPrimary = true;
    }

    await hostel.save();

    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: {
        remainingImages: hostel.images.length
      }
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting image'
    });
  }
});

// @desc    Set primary image
// @route   PUT /api/hostels/:id/images/:imageId/primary
// @access  Private (HostelOwner only)
router.put('/:id/images/:imageId/primary', protect, authorize('HostelOwner'), async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id);

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    // Check if user owns the hostel
    if (hostel.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this hostel'
      });
    }

    const imageIndex = hostel.images.findIndex(img => img._id.toString() === req.params.imageId);
    
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Remove primary flag from all images
    hostel.images.forEach(img => img.isPrimary = false);
    
    // Set new primary image
    hostel.images[imageIndex].isPrimary = true;

    await hostel.save();

    res.json({
      success: true,
      message: 'Primary image updated successfully',
      data: {
        primaryImage: hostel.images[imageIndex]
      }
    });
  } catch (error) {
    console.error('Set primary image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while setting primary image'
    });
  }
});

// @desc    Search hostels
// @route   GET /api/hostels/search
// @access  Public
router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { q, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const searchRegex = new RegExp(q, 'i');
    
    const hostels = await Hostel.find({
      $and: [
        { status: 'Active', isVerified: true },
        {
          $or: [
            { name: searchRegex },
            { description: searchRegex },
            { 'address.city': searchRegex },
            { 'address.state': searchRegex },
            { 'address.street': searchRegex },
            { facilities: { $in: [searchRegex] } }
          ]
        }
      ]
    })
    .populate('owner', 'name email phone')
    .sort({ averageRating: -1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Hostel.countDocuments({
      $and: [
        { status: 'Active', isVerified: true },
        {
          $or: [
            { name: searchRegex },
            { description: searchRegex },
            { 'address.city': searchRegex },
            { 'address.state': searchRegex },
            { 'address.street': searchRegex },
            { facilities: { $in: [searchRegex] } }
          ]
        }
      ]
    });

    res.json({
      success: true,
      data: {
        hostels,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalHostels: total,
          hasNext: skip + hostels.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Search hostels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching hostels'
    });
  }
});

module.exports = router;
