'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import dynamic from 'next/dynamic'

const ThemeToggle = dynamic(() => import('@/components/ThemeToggle').then(mod => ({ default: mod.ThemeToggle })), {
  ssr: false,
  loading: () => <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
})
import { 
  HomeIcon, 
  MapPinIcon, 
  ChatBubbleLeftRightIcon, 
  ShieldCheckIcon,
  StarIcon,
  UsersIcon,
  HeartIcon,
  ArrowRightIcon,
  SparklesIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { 
  StarIcon as StarIconSolid,
  HeartIcon as HeartIconSolid,
  CheckCircleIcon
} from '@heroicons/react/24/solid'
import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  const features = [
    {
      icon: HomeIcon,
      title: 'Find Perfect Hostels',
      description: 'Browse verified hostels with detailed information, photos, and reviews from real students.',
      color: 'text-blue-600'
    },
    {
      icon: MapPinIcon,
      title: 'Location-Based Search',
      description: 'Find hostels near your university with our advanced location-based search and filters.',
      color: 'text-green-600'
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Real-Time Chat',
      description: 'Connect with roommates and hostel communities through our real-time chat system.',
      color: 'text-purple-600'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Safety Features',
      description: 'Share your location, send panic alerts, and stay connected with emergency contacts.',
      color: 'text-red-600'
    },
    {
      icon: StarIcon,
      title: 'Reviews & Ratings',
      description: 'Read authentic reviews from students and rate your hostel experience.',
      color: 'text-yellow-600'
    },
    {
      icon: UsersIcon,
      title: 'Community Building',
      description: 'Join hostel communities, participate in events, and make lifelong friends.',
      color: 'text-indigo-600'
    }
  ]

  const stats = [
    { label: 'Hostels Listed', value: '500+' },
    { label: 'Happy Students', value: '10,000+' },
    { label: 'Cities Covered', value: '50+' },
    { label: 'Universities', value: '200+' }
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gradient-primary">RoomVerse</h1>
              </div>
            </div>
            
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="#features" className="nav-link">
                  Features
                </a>
                <a href="#about" className="nav-link">
                  About
                </a>
                <a href="#contact" className="nav-link">
                  Contact
                </a>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggle size="md" />
              {isClient && user ? (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="btn-primary"
                >
                  Dashboard
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="btn-outline"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => router.push('/auth/register')}
                    className="btn-primary"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-gray-200/50 dark:border-gray-700/50">
              <SparklesIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Trusted by 10,000+ students
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
              Find Your Perfect
              <span className="text-gradient-primary block mt-2">Student Home</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Discover verified hostels, connect with roommates, and build your student community. 
              Your journey to the perfect accommodation starts here.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={() => router.push('/hostels')}
                className="btn-primary btn-xl group"
              >
                Browse Hostels
                <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
              <button
                onClick={() => router.push('/auth/register')}
                className="btn-outline btn-xl"
              >
                Join Community
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-success-500" />
                <span>Verified Hostels</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-success-500" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-success-500" />
                <span>Secure Payments</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-20 left-10 animate-float">
          <div className="w-20 h-20 bg-primary-200/30 dark:bg-primary-800/30 rounded-full blur-sm"></div>
        </div>
        <div className="absolute bottom-20 right-10 animate-float" style={{ animationDelay: '1s' }}>
          <div className="w-16 h-16 bg-accent-200/30 dark:bg-accent-800/30 rounded-full blur-sm"></div>
        </div>
        <div className="absolute top-1/2 left-1/4 animate-float" style={{ animationDelay: '2s' }}>
          <div className="w-12 h-12 bg-success-200/30 dark:bg-success-800/30 rounded-full blur-sm"></div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="text-4xl md:text-5xl font-bold text-gradient-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-primary-100 dark:bg-primary-900/30 rounded-full px-4 py-2 mb-6">
              <AcademicCapIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                Student-First Platform
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Everything You Need for
              <span className="text-gradient-primary block">Student Life</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              From finding the perfect hostel to building lasting friendships, 
              RoomVerse has all the tools you need for a great student experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card-hover p-8 group animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className={`w-16 h-16 ${feature.color} mb-6 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-success-100 dark:bg-success-900/30 rounded-full px-4 py-2 mb-6">
              <HeartIcon className="w-4 h-4 text-success-600 dark:text-success-400" />
              <span className="text-sm font-medium text-success-700 dark:text-success-300">
                Loved by Students
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              What Students Say
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Real experiences from our community members
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Priya Sharma",
                university: "Delhi University",
                avatar: "PS",
                text: "RoomVerse helped me find the perfect hostel near my university. The community features are amazing and I've made great friends!"
              },
              {
                name: "Arjun Patel",
                university: "IIT Mumbai",
                avatar: "AP",
                text: "The safety features and real-time chat made me feel secure. Found my ideal roommate through the platform!"
              },
              {
                name: "Sneha Reddy",
                university: "Bangalore University",
                avatar: "SR",
                text: "Amazing experience! The reviews and ratings helped me choose the best hostel. Highly recommended!"
              }
            ].map((testimonial, i) => (
              <div key={i} className="card-hover p-8 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-center mb-6">
                  {[...Array(5)].map((_, j) => (
                    <StarIconSolid key={j} className="w-5 h-5 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold mr-4">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{testimonial.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{testimonial.university}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary-600 via-primary-700 to-accent-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
            <BuildingOfficeIcon className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">
              Join 10,000+ Students
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Ready to Find Your
            <span className="block">Perfect Home?</span>
          </h2>
          <p className="text-xl text-primary-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join thousands of students who have found their ideal accommodation through RoomVerse. 
            Start your journey today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/auth/register')}
              className="btn bg-white text-primary-600 hover:bg-gray-100 btn-xl group"
            >
              Get Started Today
              <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
            <button
              onClick={() => router.push('/hostels')}
              className="btn border-2 border-white text-white hover:bg-white hover:text-primary-600 btn-xl"
            >
              Browse Hostels
            </button>
          </div>
        </div>
        
        {/* Background elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-float"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }}></div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <h3 className="text-3xl font-bold text-gradient-primary mb-6">RoomVerse</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Your trusted platform for student accommodation and community building. 
                Connecting students with their perfect homes.
              </p>
              <div className="flex items-center gap-4">
                <ThemeToggle size="sm" />
                <span className="text-sm text-gray-400">Toggle theme</span>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-6 text-lg">Quick Links</h4>
              <ul className="space-y-3">
                <li><Link href="/hostels" className="text-gray-400 hover:text-white transition-colors duration-200">Browse Hostels</Link></li>
                <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors duration-200">About Us</Link></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors duration-200">Contact</Link></li>
                <li><Link href="/help" className="text-gray-400 hover:text-white transition-colors duration-200">Help Center</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-6 text-lg">For Students</h4>
              <ul className="space-y-3">
                <li><Link href="/auth/register" className="text-gray-400 hover:text-white transition-colors duration-200">Sign Up</Link></li>
                <li><Link href="/auth/login" className="text-gray-400 hover:text-white transition-colors duration-200">Login</Link></li>
                <li><Link href="/hostels" className="text-gray-400 hover:text-white transition-colors duration-200">Find Hostels</Link></li>
                <li><Link href="/community" className="text-gray-400 hover:text-white transition-colors duration-200">Community</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-6 text-lg">For Owners</h4>
              <ul className="space-y-3">
                <li><Link href="/owner/register" className="text-gray-400 hover:text-white transition-colors duration-200">List Your Hostel</Link></li>
                <li><Link href="/owner/dashboard" className="text-gray-400 hover:text-white transition-colors duration-200">Owner Dashboard</Link></li>
                <li><Link href="/pricing" className="text-gray-400 hover:text-white transition-colors duration-200">Pricing</Link></li>
                <li><Link href="/support" className="text-gray-400 hover:text-white transition-colors duration-200">Support</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 dark:border-gray-700 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400">
                © 2024 RoomVerse. All rights reserved.
              </p>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <Link href="/privacy" className="hover:text-white transition-colors duration-200">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-white transition-colors duration-200">Terms of Service</Link>
                <Link href="/cookies" className="hover:text-white transition-colors duration-200">Cookie Policy</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
