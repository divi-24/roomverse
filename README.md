# RoomVerse - Student Accommodation & Community Platform

RoomVerse is a comprehensive full-stack web application designed to help students find the perfect accommodation while building a strong community. The platform connects students with hostel owners, facilitates roommate matching, and provides safety features for a secure living experience.

## 🚀 Features

### Core Features
- **User Authentication & Role Management**: JWT-based authentication with roles (Student, Parent, HostelOwner, Admin)
- **Hostel/PG Listings**: Complete CRUD operations with image upload, detailed information, and search/filter capabilities
- **Real-time Chat**: Socket.IO powered chat system for roommates and hostel-wide communication
- **Reviews & Ratings**: Comprehensive review system with detailed ratings for different aspects
- **Safety Features**: Live location sharing, panic button, and "I'll be late" notifications
- **Payment Integration**: Razorpay integration for secure payment processing
- **Maps Integration**: Google Maps API for location services and live tracking

### User Roles
- **Students**: Browse hostels, book accommodation, chat with roommates, leave reviews
- **Parents**: Monitor child's accommodation, receive safety notifications
- **Hostel Owners**: Manage listings, handle bookings, respond to reviews
- **Admin**: Platform management and user oversight

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 with React 18
- **Styling**: TailwindCSS with custom components
- **State Management**: React Context API
- **Real-time**: Socket.IO client
- **HTTP Client**: Axios
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **Maps**: Google Maps API

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt
- **Real-time**: Socket.IO
- **File Upload**: Multer with Cloudinary
- **Email**: Nodemailer
- **SMS**: Twilio
- **Payments**: Razorpay
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

Before running the application, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd roomverse
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Configuration

#### Backend Environment Variables
Create a `.env` file in the `backend` directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/roomverse

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Frontend URL
CLIENT_URL=http://localhost:3000
```

#### Frontend Environment Variables
Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### 4. Database Setup
```bash
# Start MongoDB (if not running)
mongod

# Seed the database with sample data
cd backend
npm run seed
```

### 5. Start the Application

#### Development Mode
```bash
# From the root directory
npm run dev
```

This will start both the backend (port 5000) and frontend (port 3000) concurrently.

#### Production Mode
```bash
# Build the frontend
cd frontend
npm run build

# Start the backend
cd ../backend
npm start
```

## 📁 Project Structure

```
roomverse/
├── backend/
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   ├── utils/            # Utility functions
│   ├── scripts/          # Database scripts
│   └── server.js         # Main server file
├── frontend/
│   ├── app/              # Next.js app directory
│   ├── components/       # Reusable components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   ├── utils/            # Utility functions
│   └── public/           # Static assets
├── package.json          # Root package.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/forgot-password` - Forgot password
- `PUT /api/auth/reset-password` - Reset password

### Hostels
- `GET /api/hostels` - Get all hostels with filters
- `GET /api/hostels/:id` - Get single hostel
- `POST /api/hostels` - Create hostel (HostelOwner only)
- `PUT /api/hostels/:id` - Update hostel (Owner only)
- `DELETE /api/hostels/:id` - Delete hostel (Owner only)
- `GET /api/hostels/search` - Search hostels

### Reviews
- `GET /api/reviews/hostel/:hostelId` - Get hostel reviews
- `POST /api/reviews` - Create review (Student only)
- `PUT /api/reviews/:id` - Update review (Owner only)
- `DELETE /api/reviews/:id` - Delete review (Owner only)

### Chats
- `GET /api/chats` - Get user's chats
- `POST /api/chats/private` - Create private chat
- `POST /api/chats/hostel` - Create hostel chat
- `GET /api/chats/:id/messages` - Get chat messages
- `POST /api/chats/:id/messages` - Send message

### Payments
- `POST /api/payments/create-order` - Create payment order
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/history` - Get payment history
- `GET /api/payments/key` - Get Razorpay key

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `GET /api/notifications/unread-count` - Get unread count

## 🎨 Frontend Components

### Key Components
- **AuthProvider**: Authentication context and state management
- **SocketProvider**: Real-time communication context
- **Layout**: Main application layout with navigation
- **Dashboard**: Role-based dashboard components
- **HostelCard**: Hostel listing display component
- **ChatInterface**: Real-time chat component
- **MapsComponent**: Google Maps integration
- **PaymentForm**: Razorpay payment integration

### Pages
- **Home**: Landing page with features and testimonials
- **Auth**: Login and registration pages
- **Dashboard**: Role-specific dashboard pages
- **Hostels**: Hostel listing and search pages
- **Chat**: Real-time chat interface
- **Profile**: User profile management

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers
- **Input Validation**: Express validator for request validation
- **Role-based Access**: Middleware for role-based authorization

## 🚨 Safety Features

### For Students
- **Live Location Sharing**: Share real-time location with hostel community
- **Panic Button**: Emergency alert system with location
- **"I'll be Late" Notifications**: Notify hostel owner and parents
- **Emergency Contacts**: Quick access to emergency contacts

### For Parents
- **Child Monitoring**: View child's hostel details and location
- **Safety Alerts**: Receive notifications for safety events
- **Communication**: Direct communication with hostel owners

## 💳 Payment Integration

### Razorpay Features
- **Secure Payments**: PCI DSS compliant payment processing
- **Multiple Payment Methods**: Cards, UPI, Net Banking, Wallets
- **Refund Management**: Automated refund processing
- **Payment History**: Complete transaction history
- **Receipt Generation**: Automatic receipt generation

## 🗺️ Maps Integration

### Google Maps Features
- **Location Search**: Find hostels near universities
- **Distance Calculation**: Calculate distance from university
- **Live Tracking**: Real-time location sharing
- **Address Validation**: Verify hostel addresses
- **Route Planning**: Get directions to hostels

## 📱 Real-time Features

### Socket.IO Implementation
- **Hostel Chats**: Community-wide communication
- **Private Chats**: One-on-one messaging
- **Location Updates**: Real-time location sharing
- **Panic Alerts**: Instant emergency notifications
- **Message Status**: Read receipts and typing indicators

## 🧪 Testing

### Sample Data
The application includes comprehensive seed data:
- **Users**: Students, parents, hostel owners, and admin
- **Hostels**: Sample hostels with complete information
- **Reviews**: Sample reviews and ratings
- **Chats**: Sample conversations
- **Notifications**: Sample notifications

### Test Accounts
```
Student: rajesh@example.com / password123
Parent: suresh@example.com / password123
Hostel Owner: vikram@example.com / password123
Admin: admin@roomverse.com / admin123
```

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB Atlas or local MongoDB
2. Configure environment variables
3. Deploy to platforms like Heroku, DigitalOcean, or AWS
4. Set up SSL certificates
5. Configure domain and DNS

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy to Vercel, Netlify, or similar platforms
3. Configure environment variables
4. Set up custom domain

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- **AI-powered Roommate Matching**: Machine learning for compatibility
- **Marketplace**: Buy/sell used items within the community
- **Event Management**: Hostel events and activities
- **Mobile App**: React Native mobile application
- **Advanced Analytics**: Dashboard analytics for hostel owners
- **Multi-language Support**: Internationalization
- **Video Chat**: Integrated video calling
- **Blockchain Integration**: Secure document verification

## 📊 Performance Optimization

- **Image Optimization**: Cloudinary integration for image processing
- **Caching**: Redis for session and data caching
- **CDN**: Content delivery network for static assets
- **Database Indexing**: Optimized MongoDB queries
- **Code Splitting**: Lazy loading for better performance

---

**RoomVerse** - Building communities, one student at a time! 🏠✨
