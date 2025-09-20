'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { 
  HomeIcon, 
  ChatBubbleLeftRightIcon, 
  MapPinIcon, 
  ExclamationTriangleIcon,
  StarIcon,
  BellIcon,
  UserGroupIcon,
  CreditCardIcon,
  ClockIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'
import Image from 'next/image'

interface DashboardStats {
  profileCompletion: number
  totalReviews: number
  totalBookings: number
  totalMessages: number
  joinedDate: string
  lastActive: string
}

interface RecentActivity {
  type: string
  message: string
  timestamp: string
  hostelName?: string
}

export default function StudentDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      // Fetch user stats
      const statsResponse = await fetch('/api/users/stats', {
        credentials: 'include'
      })
      const statsData = await statsResponse.json()
      if (statsData.success) {
        setStats(statsData.data.stats)
      }

      // Fetch unread notifications count
      const notificationsResponse = await fetch('/api/notifications/unread-count', {
        credentials: 'include'
      })
      const notificationsData = await notificationsResponse.json()
      if (notificationsData.success) {
        setUnreadNotifications(notificationsData.data.unreadCount)
      }

      // Fetch unread messages count
      const messagesResponse = await fetch('/api/chats/unread-count', {
        credentials: 'include'
      })
      const messagesData = await messagesResponse.json()
      if (messagesData.success) {
        setUnreadMessages(messagesData.data.unreadCount)
      }

      // Mock recent activity data
      setRecentActivity([
        {
          type: 'review',
          message: 'You reviewed Green Valley Hostel',
          timestamp: '2 hours ago',
          hostelName: 'Green Valley Hostel'
        },
        {
          type: 'message',
          message: 'New message from Priya Sharma',
          timestamp: '4 hours ago'
        },
        {
          type: 'booking',
          message: 'Your booking at Sunshine PG was confirmed',
          timestamp: '1 day ago',
          hostelName: 'Sunshine PG'
        }
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const sendPanicAlert = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch('/api/users/panic-alert', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              message: 'Emergency! Help needed!'
            })
          })

          if (response.ok) {
            alert('Panic alert sent successfully! Emergency contacts have been notified.')
          }
        } catch (error) {
          console.error('Error sending panic alert:', error)
          alert('Failed to send panic alert. Please try again.')
        }
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('Unable to get your location. Please try again.')
      }
    )
  }

  const sendLateNotification = async () => {
    const expectedTime = prompt('When do you expect to arrive? (e.g., 10:30 PM)')
    const reason = prompt('Reason for being late (optional):')

    if (expectedTime) {
      try {
        const response = await fetch('/api/users/late-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            expectedTime: new Date(`2024-01-01 ${expectedTime}`).toISOString(),
            reason: reason || 'No reason provided'
          })
        })

        if (response.ok) {
          alert('Late notification sent successfully!')
        }
      } catch (error) {
        console.error('Error sending late notification:', error)
        alert('Failed to send late notification. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
              <p className="text-gray-600 mt-1">Here's what's happening with your accommodation</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/notifications" className="relative">
                <BellIcon className="w-6 h-6 text-gray-600" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </Link>
              
              <Link href="/chat" className="relative">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-gray-600" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HomeIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Current Hostel</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user.currentHostel ? user.currentHostel.name : 'Not assigned'}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <StarIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Reviews Written</p>
                <p className="text-lg font-semibold text-gray-900">
                  {stats?.totalReviews || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Messages</p>
                <p className="text-lg font-semibold text-gray-900">
                  {unreadMessages} unread
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <UserGroupIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Profile Complete</p>
                <p className="text-lg font-semibold text-gray-900">
                  {stats?.profileCompletion || 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Current Hostel */}
            {user.currentHostel ? (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Your Current Hostel</h2>
                  <Link href={`/hostels/${user.currentHostel._id}`} className="text-primary-600 hover:text-primary-700">
                    View Details
                  </Link>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{user.currentHostel.name}</h3>
                    <p className="text-sm text-gray-600">
                      {user.currentHostel.address.city}, {user.currentHostel.address.state}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <Link href="/chat" className="btn-outline btn-sm">
                        <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1" />
                        Chat
                      </Link>
                      <Link href="/reviews" className="btn-outline btn-sm">
                        <StarIcon className="w-4 h-4 mr-1" />
                        Write Review
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card p-6">
                <div className="text-center">
                  <HomeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">No Hostel Assigned</h2>
                  <p className="text-gray-600 mb-4">
                    You haven't been assigned to any hostel yet. Browse available hostels to find your perfect accommodation.
                  </p>
                  <Link href="/hostels" className="btn-primary">
                    Browse Hostels
                  </Link>
                </div>
              </div>
            )}

            {/* Safety Features */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Safety Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={sendPanicAlert}
                  className="flex items-center justify-center gap-2 p-4 border-2 border-red-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
                >
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  <span className="font-medium text-red-600">Panic Alert</span>
                </button>
                
                <button
                  onClick={sendLateNotification}
                  className="flex items-center justify-center gap-2 p-4 border-2 border-yellow-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
                >
                  <ClockIcon className="w-6 h-6 text-yellow-600" />
                  <span className="font-medium text-yellow-600">I'll be Late</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {activity.type === 'review' && <StarIcon className="w-4 h-4 text-yellow-600" />}
                      {activity.type === 'message' && <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-600" />}
                      {activity.type === 'booking' && <HomeIcon className="w-4 h-4 text-green-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/hostels" className="btn-outline w-full justify-start">
                  <HomeIcon className="w-4 h-4 mr-2" />
                  Browse Hostels
                </Link>
                <Link href="/chat" className="btn-outline w-full justify-start">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                  Messages
                </Link>
                <Link href="/profile" className="btn-outline w-full justify-start">
                  <UserGroupIcon className="w-4 h-4 mr-2" />
                  Edit Profile
                </Link>
                <Link href="/payments" className="btn-outline w-full justify-start">
                  <CreditCardIcon className="w-4 h-4 mr-2" />
                  Payments
                </Link>
              </div>
            </div>

            {/* Profile Completion */}
            {stats && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Completion</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-medium">{stats.profileCompletion}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.profileCompletion}%` }}
                    ></div>
                  </div>
                  <Link href="/profile" className="text-sm text-primary-600 hover:text-primary-700">
                    Complete your profile →
                  </Link>
                </div>
              </div>
            )}

            {/* Emergency Contacts */}
            {user.emergencyContacts && user.emergencyContacts.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contacts</h3>
                <div className="space-y-3">
                  {user.emergencyContacts.map((contact, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                        <p className="text-xs text-gray-600">{contact.relationship}</p>
                      </div>
                      <a 
                        href={`tel:${contact.phone}`}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
