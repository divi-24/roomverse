'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

interface User {
  _id: string
  name: string
  email: string
  phone: string
  role: 'Student' | 'Parent' | 'HostelOwner' | 'Admin'
  profileImage?: string
  isVerified: boolean
  studentId?: string
  university?: string
  course?: string
  yearOfStudy?: number
  currentHostel?: {
    _id: string
    name: string
    address: {
      city: string
      state: string
    }
  }
  parentContact?: {
    name: string
    phone: string
    email: string
  }
  businessLicense?: string
  address?: {
    street: string
    city: string
    state: string
    pincode: string
    country: string
  }
  preferences?: {
    budget: {
      min: number
      max: number
    }
    facilities: string[]
    location: {
      latitude: number
      longitude: number
      radius: number
    }
  }
  emergencyContacts?: Array<{
    name: string
    phone: string
    relationship: string
  }>
  lastActive: string
  isOnline: boolean
  createdAt: string
  updatedAt: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => void
  updateProfile: (userData: Partial<User>) => Promise<void>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  refreshUser: () => Promise<void>
}

interface RegisterData {
  name: string
  email: string
  password: string
  phone: string
  role: 'Student' | 'Parent' | 'HostelOwner' | 'Admin'
  studentId?: string
  university?: string
  course?: string
  yearOfStudy?: number
  businessLicense?: string
  parentContact?: {
    name: string
    phone: string
    email: string
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Configure axios defaults
axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
axios.defaults.withCredentials = true

// Request interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      Cookies.remove('token')
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = Cookies.get('token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await axios.get('/auth/me')
      if (response.data.success) {
        setUser(response.data.data.user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      Cookies.remove('token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      const response = await axios.post('/auth/login', { email, password })
      
      if (response.data.success) {
        const { token, data } = response.data
        
        // Set token in cookie
        Cookies.set('token', token, { 
          expires: 7, // 7 days
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
        
        setUser(data.user)
        toast.success('Login successful!')
        
        // Redirect based on role
        const redirectPath = getRedirectPath(data.user.role)
        router.push(redirectPath)
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData: RegisterData) => {
    try {
      setLoading(true)
      const response = await axios.post('/auth/register', userData)
      
      if (response.data.success) {
        toast.success('Registration successful! Please check your email to verify your account.')
        router.push('/auth/verify-email')
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await axios.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      Cookies.remove('token')
      setUser(null)
      router.push('/')
      toast.success('Logged out successfully')
    }
  }

  const updateProfile = async (userData: Partial<User>) => {
    try {
      setLoading(true)
      const response = await axios.put('/auth/profile', userData)
      
      if (response.data.success) {
        setUser(response.data.data.user)
        toast.success('Profile updated successfully!')
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Profile update failed'
      toast.error(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setLoading(true)
      const response = await axios.put('/auth/password', {
        currentPassword,
        newPassword
      })
      
      if (response.data.success) {
        toast.success('Password updated successfully!')
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Password update failed'
      toast.error(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const forgotPassword = async (email: string) => {
    try {
      setLoading(true)
      const response = await axios.post('/auth/forgot-password', { email })
      
      if (response.data.success) {
        toast.success('Password reset email sent!')
        router.push('/auth/check-email')
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send reset email'
      toast.error(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (token: string, password: string) => {
    try {
      setLoading(true)
      const response = await axios.put('/auth/reset-password', { token, password })
      
      if (response.data.success) {
        toast.success('Password reset successful!')
        router.push('/auth/login')
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Password reset failed'
      toast.error(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const verifyEmail = async (token: string) => {
    try {
      setLoading(true)
      const response = await axios.get(`/auth/verify-email?token=${token}`)
      
      if (response.data.success) {
        toast.success('Email verified successfully!')
        router.push('/auth/login')
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Email verification failed'
      toast.error(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    try {
      const response = await axios.get('/auth/me')
      if (response.data.success) {
        setUser(response.data.data.user)
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  const getRedirectPath = (role: string) => {
    switch (role) {
      case 'Student':
        return '/dashboard/student'
      case 'Parent':
        return '/dashboard/parent'
      case 'HostelOwner':
        return '/dashboard/owner'
      case 'Admin':
        return '/dashboard/admin'
      default:
        return '/dashboard'
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
