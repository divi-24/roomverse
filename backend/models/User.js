const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
  },
  role: {
    type: String,
    enum: ['Student', 'Parent', 'HostelOwner', 'Admin'],
    default: 'Student'
  },
  profileImage: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // Student specific fields
  studentId: {
    type: String,
    required: function() { return this.role === 'Student'; }
  },
  university: {
    type: String,
    required: function() { return this.role === 'Student'; }
  },
  course: {
    type: String,
    required: function() { return this.role === 'Student'; }
  },
  yearOfStudy: {
    type: Number,
    required: function() { return this.role === 'Student'; }
  },
  currentHostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel'
  },
  parentContact: {
    name: String,
    phone: String,
    email: String
  },
  
  // Parent specific fields
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // HostelOwner specific fields
  businessLicense: {
    type: String,
    required: function() { return this.role === 'HostelOwner'; }
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  
  // Common fields
  preferences: {
    budget: {
      min: Number,
      max: Number
    },
    facilities: [String],
    location: {
      latitude: Number,
      longitude: Number,
      radius: { type: Number, default: 5 } // in km
    }
  },
  
  // Safety features
  emergencyContacts: [{
    name: String,
    phone: String,
    relationship: String
  }],
  
  // Activity tracking
  lastActive: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'preferences.location.latitude': 1, 'preferences.location.longitude': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.verificationToken;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpire;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
