const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hostel name is required'],
    trim: true,
    maxlength: [100, 'Hostel name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Location
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
    },
    country: {
      type: String,
      default: 'India'
    },
    coordinates: {
      latitude: {
        type: Number,
        required: [true, 'Latitude is required']
      },
      longitude: {
        type: Number,
        required: [true, 'Longitude is required']
      }
    }
  },
  
  // Pricing
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
    electricityCharges: {
      type: String,
      enum: ['Included', 'Extra', 'Metered'],
      default: 'Included'
    },
    waterCharges: {
      type: String,
      enum: ['Included', 'Extra'],
      default: 'Included'
    }
  },
  
  // Room details
  rooms: [{
    type: {
      type: String,
      enum: ['Single', 'Double', 'Triple', 'Quad'],
      required: true
    },
    totalRooms: {
      type: Number,
      required: true,
      min: [1, 'Must have at least 1 room']
    },
    availableRooms: {
      type: Number,
      required: true,
      min: [0, 'Available rooms cannot be negative']
    },
    roomSize: {
      type: String,
      required: true
    },
    amenities: [String]
  }],
  
  // Facilities
  facilities: {
    wifi: { type: Boolean, default: false },
    laundry: { type: Boolean, default: false },
    parking: { type: Boolean, default: false },
    security: { type: Boolean, default: false },
    cctv: { type: Boolean, default: false },
    powerBackup: { type: Boolean, default: false },
    commonArea: { type: Boolean, default: false },
    kitchen: { type: Boolean, default: false },
    gym: { type: Boolean, default: false },
    studyRoom: { type: Boolean, default: false },
    tvRoom: { type: Boolean, default: false },
    ac: { type: Boolean, default: false },
    geyser: { type: Boolean, default: false },
    refrigerator: { type: Boolean, default: false }
  },
  
  // Food options
  foodOptions: {
    available: { type: Boolean, default: false },
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
  
  // Rules and policies
  rules: [String],
  checkInTime: {
    type: String,
    default: '10:00 AM'
  },
  checkOutTime: {
    type: String,
    default: '10:00 AM'
  },
  
  // Images
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Status and verification
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Under Review', 'Rejected'],
    default: 'Under Review'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDate: Date,
  
  // Ratings and reviews
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5']
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  
  // Occupancy
  totalCapacity: {
    type: Number,
    required: true,
    min: [1, 'Must have at least 1 bed']
  },
  currentOccupancy: {
    type: Number,
    default: 0,
    min: [0, 'Occupancy cannot be negative']
  },
  
  // Contact information
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Contact phone is required']
    },
    email: {
      type: String,
      required: [true, 'Contact email is required']
    },
    alternatePhone: String
  },
  
  // Safety features
  safetyFeatures: {
    emergencyExit: { type: Boolean, default: false },
    fireExtinguisher: { type: Boolean, default: false },
    firstAidKit: { type: Boolean, default: false },
    securityGuard: { type: Boolean, default: false },
    panicButton: { type: Boolean, default: false }
  },
  
  // Nearby places
  nearbyPlaces: [{
    name: String,
    type: {
      type: String,
      enum: ['University', 'Hospital', 'Market', 'Transport', 'Restaurant', 'Bank', 'ATM']
    },
    distance: Number, // in km
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
hostelSchema.index({ 'address.coordinates.latitude': 1, 'address.coordinates.longitude': 1 });
hostelSchema.index({ 'pricing.monthlyRent': 1 });
hostelSchema.index({ status: 1, isVerified: 1 });
hostelSchema.index({ owner: 1 });
hostelSchema.index({ averageRating: -1 });

// Virtual for occupancy percentage
hostelSchema.virtual('occupancyPercentage').get(function() {
  return this.totalCapacity > 0 ? (this.currentOccupancy / this.totalCapacity) * 100 : 0;
});

// Method to check availability
hostelSchema.methods.isAvailable = function() {
  return this.status === 'Active' && this.isVerified && this.currentOccupancy < this.totalCapacity;
};

// Method to get primary image
hostelSchema.methods.getPrimaryImage = function() {
  const primaryImage = this.images.find(img => img.isPrimary);
  return primaryImage ? primaryImage.url : (this.images.length > 0 ? this.images[0].url : '');
};

module.exports = mongoose.model('Hostel', hostelSchema);
