const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Review = require('../models/Review');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/roomverse', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedData = async () => {
  try {
    console.log('🌱 Starting to seed database...');

    // Clear existing data
    await User.deleteMany({});
    await Hostel.deleteMany({});
    await Review.deleteMany({});
    await Chat.deleteMany({});
    await Notification.deleteMany({});

    console.log('🗑️  Cleared existing data');

    // Create users
    const users = await createUsers();
    console.log(`👥 Created ${users.length} users`);

    // Create hostels
    const hostels = await createHostels(users);
    console.log(`🏠 Created ${hostels.length} hostels`);

    // Create reviews
    const reviews = await createReviews(users, hostels);
    console.log(`⭐ Created ${reviews.length} reviews`);

    // Create chats
    const chats = await createChats(users, hostels);
    console.log(`💬 Created ${chats.length} chats`);

    // Create notifications
    const notifications = await createNotifications(users, hostels);
    console.log(`🔔 Created ${notifications.length} notifications`);

    console.log('✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

const createUsers = async () => {
  const users = [
    // Students
    {
      name: 'Rajesh Kumar',
      email: 'rajesh@example.com',
      password: 'password123',
      phone: '9876543210',
      role: 'Student',
      studentId: 'STU001',
      university: 'Delhi University',
      course: 'Computer Science',
      yearOfStudy: 2,
      parentContact: {
        name: 'Suresh Kumar',
        phone: '9876543211',
        email: 'suresh@example.com'
      },
      preferences: {
        budget: { min: 5000, max: 15000 },
        facilities: ['wifi', 'laundry', 'parking'],
        location: {
          latitude: 28.6139,
          longitude: 77.2090,
          radius: 5
        }
      },
      emergencyContacts: [
        {
          name: 'Priya Kumar',
          phone: '9876543212',
          relationship: 'Sister'
        }
      ],
      isVerified: true
    },
    {
      name: 'Priya Sharma',
      email: 'priya@example.com',
      password: 'password123',
      phone: '9876543213',
      role: 'Student',
      studentId: 'STU002',
      university: 'JNU',
      course: 'Economics',
      yearOfStudy: 3,
      preferences: {
        budget: { min: 8000, max: 20000 },
        facilities: ['wifi', 'gym', 'studyRoom'],
        location: {
          latitude: 28.5450,
          longitude: 77.1650,
          radius: 3
        }
      },
      isVerified: true
    },
    {
      name: 'Amit Singh',
      email: 'amit@example.com',
      password: 'password123',
      phone: '9876543214',
      role: 'Student',
      studentId: 'STU003',
      university: 'IIT Delhi',
      course: 'Mechanical Engineering',
      yearOfStudy: 1,
      preferences: {
        budget: { min: 10000, max: 25000 },
        facilities: ['wifi', 'laundry', 'gym', 'parking'],
        location: {
          latitude: 28.5450,
          longitude: 77.1650,
          radius: 2
        }
      },
      isVerified: true
    },
    // Parents
    {
      name: 'Suresh Kumar',
      email: 'suresh@example.com',
      password: 'password123',
      phone: '9876543211',
      role: 'Parent',
      isVerified: true
    },
    {
      name: 'Meera Sharma',
      email: 'meera@example.com',
      password: 'password123',
      phone: '9876543215',
      role: 'Parent',
      isVerified: true
    },
    // Hostel Owners
    {
      name: 'Vikram Agarwal',
      email: 'vikram@example.com',
      password: 'password123',
      phone: '9876543216',
      role: 'HostelOwner',
      businessLicense: 'BL001',
      address: {
        street: '123 Main Street',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        country: 'India'
      },
      isVerified: true
    },
    {
      name: 'Sunita Gupta',
      email: 'sunita@example.com',
      password: 'password123',
      phone: '9876543217',
      role: 'HostelOwner',
      businessLicense: 'BL002',
      address: {
        street: '456 Park Avenue',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110002',
        country: 'India'
      },
      isVerified: true
    },
    // Admin
    {
      name: 'Admin User',
      email: 'admin@roomverse.com',
      password: 'admin123',
      phone: '9876543218',
      role: 'Admin',
      isVerified: true
    }
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = new User(userData);
    await user.save();
    createdUsers.push(user);
  }

  return createdUsers;
};

const createHostels = async (users) => {
  const hostelOwners = users.filter(user => user.role === 'HostelOwner');
  const students = users.filter(user => user.role === 'Student');

  const hostels = [
    {
      name: 'Green Valley Boys Hostel',
      description: 'A modern and comfortable hostel for students with excellent facilities and 24/7 security. Located near Delhi University with easy access to public transport.',
      owner: hostelOwners[0]._id,
      address: {
        street: '123 University Road',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110007',
        country: 'India',
        coordinates: {
          latitude: 28.6139,
          longitude: 77.2090
        }
      },
      pricing: {
        monthlyRent: 12000,
        securityDeposit: 10000,
        maintenanceCharges: 1000,
        electricityCharges: 'Metered',
        waterCharges: 'Included'
      },
      rooms: [
        {
          type: 'Double',
          totalRooms: 20,
          availableRooms: 15,
          roomSize: '12x10 ft',
          amenities: ['Bed', 'Study Table', 'Wardrobe', 'Fan']
        },
        {
          type: 'Triple',
          totalRooms: 15,
          availableRooms: 10,
          roomSize: '15x12 ft',
          amenities: ['Bed', 'Study Table', 'Wardrobe', 'Fan', 'AC']
        }
      ],
      facilities: {
        wifi: true,
        laundry: true,
        parking: true,
        security: true,
        cctv: true,
        powerBackup: true,
        commonArea: true,
        kitchen: true,
        gym: true,
        studyRoom: true,
        tvRoom: true,
        ac: true,
        geyser: true,
        refrigerator: true
      },
      foodOptions: {
        available: true,
        type: 'Both',
        mealPlan: 'All Meals',
        monthlyCost: 5000
      },
      rules: [
        'No smoking or drinking',
        'Maintain cleanliness',
        'Follow hostel timings',
        'Respect other residents'
      ],
      checkInTime: '10:00 AM',
      checkOutTime: '10:00 AM',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
          caption: 'Main entrance',
          isPrimary: true
        },
        {
          url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
          caption: 'Common area'
        }
      ],
      status: 'Active',
      isVerified: true,
      verificationDate: new Date(),
      totalCapacity: 75,
      currentOccupancy: 25,
      contactInfo: {
        phone: '9876543216',
        email: 'vikram@example.com',
        alternatePhone: '9876543219'
      },
      safetyFeatures: {
        emergencyExit: true,
        fireExtinguisher: true,
        firstAidKit: true,
        securityGuard: true,
        panicButton: true
      },
      nearbyPlaces: [
        {
          name: 'Delhi University',
          type: 'University',
          distance: 0.5,
          coordinates: { latitude: 28.6139, longitude: 77.2090 }
        },
        {
          name: 'Rajiv Chowk Metro Station',
          type: 'Transport',
          distance: 1.2,
          coordinates: { latitude: 28.6304, longitude: 77.2177 }
        }
      ]
    },
    {
      name: 'Sunshine Girls PG',
      description: 'A safe and comfortable PG accommodation for female students with modern amenities and round-the-clock security.',
      owner: hostelOwners[1]._id,
      address: {
        street: '456 Park Avenue',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110002',
        country: 'India',
        coordinates: {
          latitude: 28.5450,
          longitude: 77.1650
        }
      },
      pricing: {
        monthlyRent: 15000,
        securityDeposit: 15000,
        maintenanceCharges: 1500,
        electricityCharges: 'Included',
        waterCharges: 'Included'
      },
      rooms: [
        {
          type: 'Single',
          totalRooms: 10,
          availableRooms: 5,
          roomSize: '10x8 ft',
          amenities: ['Bed', 'Study Table', 'Wardrobe', 'Fan', 'AC']
        },
        {
          type: 'Double',
          totalRooms: 20,
          availableRooms: 12,
          roomSize: '12x10 ft',
          amenities: ['Bed', 'Study Table', 'Wardrobe', 'Fan', 'AC']
        }
      ],
      facilities: {
        wifi: true,
        laundry: true,
        parking: true,
        security: true,
        cctv: true,
        powerBackup: true,
        commonArea: true,
        kitchen: true,
        gym: false,
        studyRoom: true,
        tvRoom: true,
        ac: true,
        geyser: true,
        refrigerator: true
      },
      foodOptions: {
        available: true,
        type: 'Veg',
        mealPlan: 'All Meals',
        monthlyCost: 6000
      },
      rules: [
        'Female residents only',
        'No male visitors after 8 PM',
        'Maintain cleanliness',
        'Follow hostel timings'
      ],
      checkInTime: '10:00 AM',
      checkOutTime: '10:00 AM',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
          caption: 'Hostel building',
          isPrimary: true
        },
        {
          url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
          caption: 'Common room'
        }
      ],
      status: 'Active',
      isVerified: true,
      verificationDate: new Date(),
      totalCapacity: 50,
      currentOccupancy: 17,
      contactInfo: {
        phone: '9876543217',
        email: 'sunita@example.com',
        alternatePhone: '9876543220'
      },
      safetyFeatures: {
        emergencyExit: true,
        fireExtinguisher: true,
        firstAidKit: true,
        securityGuard: true,
        panicButton: true
      },
      nearbyPlaces: [
        {
          name: 'JNU',
          type: 'University',
          distance: 0.8,
          coordinates: { latitude: 28.5450, longitude: 77.1650 }
        },
        {
          name: 'Saket Metro Station',
          type: 'Transport',
          distance: 1.5,
          coordinates: { latitude: 28.5275, longitude: 77.2189 }
        }
      ]
    }
  ];

  const createdHostels = [];
  for (const hostelData of hostels) {
    const hostel = new Hostel(hostelData);
    await hostel.save();
    createdHostels.push(hostel);
  }

  // Assign some students to hostels
  if (students.length > 0 && createdHostels.length > 0) {
    students[0].currentHostel = createdHostels[0]._id;
    students[1].currentHostel = createdHostels[1]._id;
    await students[0].save();
    await students[1].save();

    // Update hostel occupancy
    createdHostels[0].currentOccupancy += 1;
    createdHostels[1].currentOccupancy += 1;
    await createdHostels[0].save();
    await createdHostels[1].save();
  }

  return createdHostels;
};

const createReviews = async (users, hostels) => {
  const students = users.filter(user => user.role === 'Student');
  const reviews = [];

  if (students.length > 0 && hostels.length > 0) {
    const reviewData = [
      {
        hostel: hostels[0]._id,
        user: students[0]._id,
        overallRating: 4,
        detailedRatings: {
          cleanliness: 4,
          food: 3,
          safety: 5,
          facilities: 4,
          valueForMoney: 4,
          staff: 4
        },
        title: 'Great hostel with good facilities',
        comment: 'The hostel has excellent facilities and the staff is very helpful. The food could be better but overall it\'s a good place to stay.',
        stayDuration: '6-12 months',
        roomType: 'Double',
        isVerified: true,
        verificationDate: new Date()
      },
      {
        hostel: hostels[1]._id,
        user: students[1]._id,
        overallRating: 5,
        detailedRatings: {
          cleanliness: 5,
          food: 5,
          safety: 5,
          facilities: 4,
          valueForMoney: 4,
          staff: 5
        },
        title: 'Perfect for female students',
        comment: 'This is an excellent PG for female students. Very safe, clean, and the food is amazing. Highly recommended!',
        stayDuration: '3-6 months',
        roomType: 'Single',
        isVerified: true,
        verificationDate: new Date()
      }
    ];

    for (const review of reviewData) {
      const newReview = new Review(review);
      await newReview.save();
      reviews.push(newReview);
    }
  }

  return reviews;
};

const createChats = async (users, hostels) => {
  const students = users.filter(user => user.role === 'Student');
  const chats = [];

  // Create private chat between students
  if (students.length >= 2) {
    const privateChat = await Chat.findOrCreatePrivateChat(students[0]._id, students[1]._id);
    chats.push(privateChat);

    // Add some messages to the private chat
    await privateChat.addMessage({
      sender: students[0]._id,
      content: 'Hi! Are you also staying at Green Valley Hostel?',
      type: 'text'
    });

    await privateChat.addMessage({
      sender: students[1]._id,
      content: 'Yes! I\'m at Sunshine PG. How are you finding your hostel?',
      type: 'text'
    });
  }

  // Create hostel chats
  for (const hostel of hostels) {
    const hostelChat = await Chat.findOrCreateHostelChat(hostel._id);
    
    // Add students to hostel chat
    const studentsInHostel = students.filter(student => 
      student.currentHostel && student.currentHostel.toString() === hostel._id.toString()
    );
    
    for (const student of studentsInHostel) {
      if (!hostelChat.participants.includes(student._id)) {
        hostelChat.participants.push(student._id);
      }
    }
    
    await hostelChat.save();
    chats.push(hostelChat);

    // Add welcome message
    await hostelChat.addMessage({
      sender: hostel.owner,
      content: `Welcome to ${hostel.name}! Please feel free to ask any questions.`,
      type: 'text'
    });
  }

  return chats;
};

const createNotifications = async (users, hostels) => {
  const notifications = [];
  const students = users.filter(user => user.role === 'Student');
  const hostelOwners = users.filter(user => user.role === 'HostelOwner');

  // Create some sample notifications
  if (students.length > 0 && hostelOwners.length > 0) {
    const notificationData = [
      {
        recipient: students[0]._id,
        type: 'booking_approved',
        title: 'Booking Approved',
        message: 'Your booking at Green Valley Boys Hostel has been approved!',
        relatedEntity: {
          type: 'hostel',
          id: hostels[0]._id
        },
        data: {
          hostelName: hostels[0].name,
          checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        channels: {
          inApp: true,
          email: true
        }
      },
      {
        recipient: hostelOwners[0]._id,
        type: 'review_added',
        title: 'New Review',
        message: 'You have received a new review for Green Valley Boys Hostel',
        relatedEntity: {
          type: 'hostel',
          id: hostels[0]._id
        },
        data: {
          hostelName: hostels[0].name
        },
        channels: {
          inApp: true,
          email: true
        }
      }
    ];

    for (const notification of notificationData) {
      const newNotification = await Notification.createNotification(notification);
      notifications.push(newNotification);
    }
  }

  return notifications;
};

// Run the seed function
seedData();
