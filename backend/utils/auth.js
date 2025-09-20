const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = generateToken(user._id);

  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      data: {
        user: user.getPublicProfile()
      }
    });
};

// Create email transporter
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send email
const sendEmail = async (options) => {
  try {
    const transporter = createEmailTransporter();

    const mailOptions = {
      from: `RoomVerse <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.message
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Send SMS using Twilio
const sendSMS = async (to, message) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log('SMS sent:', result.sid);
    return result;
  } catch (error) {
    console.error('SMS sending error:', error);
    throw error;
  }
};

// Generate random verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Validate phone number (Indian format)
const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

// Generate secure random string
const generateSecureRandomString = (length = 32) => {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
};

// Hash sensitive data
const hashSensitiveData = (data) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Create password reset token
const createPasswordResetToken = () => {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token and set to resetPasswordToken field
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  return { resetToken, hashedToken };
};

// Format user data for response
const formatUserResponse = (user) => {
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.verificationToken;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpire;
  return userObj;
};

// Check if user has permission for action
const hasPermission = (userRole, action, resource = null) => {
  const permissions = {
    Admin: ['*'], // Admin has all permissions
    HostelOwner: [
      'create_hostel', 'update_hostel', 'delete_hostel', 'view_hostel',
      'manage_bookings', 'view_reviews', 'respond_reviews',
      'manage_tenants', 'view_payments', 'create_announcements'
    ],
    Student: [
      'view_hostels', 'create_booking', 'view_booking', 'cancel_booking',
      'create_review', 'update_review', 'delete_review',
      'join_chat', 'send_message', 'share_location',
      'create_complaint', 'view_complaint'
    ],
    Parent: [
      'view_child_hostel', 'view_child_location', 'receive_notifications',
      'view_emergency_alerts'
    ]
  };

  const userPermissions = permissions[userRole] || [];
  
  // Admin has all permissions
  if (userPermissions.includes('*')) {
    return true;
  }
  
  return userPermissions.includes(action);
};

// Sanitize user input
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  return input;
};

// Generate unique room code for chat
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

module.exports = {
  generateToken,
  sendTokenResponse,
  sendEmail,
  sendSMS,
  generateVerificationCode,
  validatePhoneNumber,
  validateEmail,
  generateSecureRandomString,
  hashSensitiveData,
  verifyToken,
  createPasswordResetToken,
  formatUserResponse,
  hasPermission,
  sanitizeInput,
  generateRoomCode,
  calculateDistance
};
