'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

interface Message {
  _id: string
  sender: {
    _id: string
    name: string
    profileImage?: string
  }
  content: string
  type: 'text' | 'image' | 'location' | 'file' | 'system'
  metadata?: {
    location?: {
      latitude: number
      longitude: number
      address: string
    }
    file?: {
      url: string
      name: string
      size: number
      type: string
    }
    image?: {
      url: string
      caption: string
    }
  }
  isRead: boolean
  readBy: Array<{
    user: string
    readAt: string
  }>
  isEdited: boolean
  editedAt?: string
  isDeleted: boolean
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

interface Chat {
  _id: string
  type: 'private' | 'hostel' | 'group'
  participants: Array<{
    _id: string
    name: string
    email: string
    profileImage?: string
  }>
  hostel?: {
    _id: string
    name: string
  }
  groupName?: string
  groupDescription?: string
  groupImage?: string
  admins?: Array<{
    _id: string
    name: string
  }>
  settings: {
    allowFileSharing: boolean
    allowLocationSharing: boolean
    muteNotifications: Array<{
      user: string
      mutedUntil?: string
    }>
  }
  lastMessage?: {
    content: string
    sender: {
      _id: string
      name: string
    }
    timestamp: string
    type: 'text' | 'image' | 'location' | 'file' | 'system'
  }
  unreadCount: Array<{
    user: string
    count: number
  }>
  isActive: boolean
  messages: Message[]
  createdAt: string
  updatedAt: string
}

interface LocationUpdate {
  userId: string
  location: {
    latitude: number
    longitude: number
    address: string
    timestamp: string
  }
}

interface PanicAlert {
  userId: string
  location: {
    latitude: number
    longitude: number
    address: string
  }
  timestamp: string
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: string
}

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  chats: Chat[]
  currentChat: Chat | null
  messages: Message[]
  unreadCount: number
  locationUpdates: LocationUpdate[]
  panicAlerts: PanicAlert[]
  notifications: Notification[]
  joinHostelChat: (hostelId: string) => void
  joinPrivateChat: (chatId: string) => void
  sendMessage: (chatId: string, content: string, type?: string, metadata?: any) => void
  shareLocation: (hostelId: string, location: any) => void
  sendPanicAlert: (hostelId: string, location: any) => void
  markMessagesAsRead: (chatId: string) => void
  setCurrentChat: (chat: Chat | null) => void
  loadChats: () => Promise<void>
  loadMessages: (chatId: string) => Promise<void>
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [locationUpdates, setLocationUpdates] = useState<LocationUpdate[]>([])
  const [panicAlerts, setPanicAlerts] = useState<PanicAlert[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Initialize socket connection
  useEffect(() => {
    if (user) {
      const newSocket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000', {
        auth: {
          token: document.cookie
            .split('; ')
            .find(row => row.startsWith('token='))
            ?.split('=')[1]
        }
      })

      newSocket.on('connect', () => {
        console.log('Connected to server')
        setIsConnected(true)
      })

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server')
        setIsConnected(false)
      })

      newSocket.on('receive-message', (data) => {
        const { chatId, message, type } = data
        
        // Update messages in current chat
        if (currentChat && currentChat._id === chatId) {
          setMessages(prev => [...prev, message])
        }
        
        // Update last message in chats list
        setChats(prev => prev.map(chat => 
          chat._id === chatId 
            ? { ...chat, lastMessage: message }
            : chat
        ))
        
        // Show notification if not in current chat
        if (!currentChat || currentChat._id !== chatId) {
          toast.success(`New message from ${message.sender.name}`)
        }
      })

      newSocket.on('location-update', (data: LocationUpdate) => {
        setLocationUpdates(prev => [data, ...prev.slice(0, 9)]) // Keep last 10 updates
      })

      newSocket.on('panic-alert', (data: PanicAlert) => {
        setPanicAlerts(prev => [data, ...prev.slice(0, 4)]) // Keep last 5 alerts
        toast.error('🚨 PANIC ALERT! Check location immediately!', {
          duration: 10000,
          style: {
            background: '#ef4444',
            color: 'white',
          }
        })
      })

      newSocket.on('new-notification', (notification: Notification) => {
        setNotifications(prev => [notification, ...prev.slice(0, 19)]) // Keep last 20 notifications
        toast.success(`${notification.title}: ${notification.message}`)
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    }
  }, [user, currentChat])

  const joinHostelChat = (hostelId: string) => {
    if (socket) {
      socket.emit('join-hostel', hostelId)
    }
  }

  const joinPrivateChat = (chatId: string) => {
    if (socket) {
      socket.emit('join-private', chatId)
    }
  }

  const sendMessage = (chatId: string, content: string, type: string = 'text', metadata?: any) => {
    if (socket && user) {
      const message = {
        chatId,
        message: {
          sender: user._id,
          content,
          type,
          metadata
        },
        type: currentChat?.type || 'private'
      }
      
      socket.emit('send-message', message)
    }
  }

  const shareLocation = (hostelId: string, location: any) => {
    if (socket && user) {
      socket.emit('share-location', {
        hostelId,
        location,
        userId: user._id
      })
    }
  }

  const sendPanicAlert = (hostelId: string, location: any) => {
    if (socket && user) {
      socket.emit('panic-alert', {
        hostelId,
        location,
        userId: user._id
      })
      
      toast.error('🚨 Panic alert sent! Emergency contacts have been notified.', {
        duration: 8000
      })
    }
  }

  const markMessagesAsRead = (chatId: string) => {
    if (socket) {
      socket.emit('mark-read', chatId)
    }
  }

  const loadChats = async () => {
    try {
      const response = await fetch('/api/chats', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setChats(data.data.chats)
        
        // Calculate total unread count
        const totalUnread = data.data.chats.reduce((sum: number, chat: Chat) => {
          const userUnread = chat.unreadCount.find(uc => uc.user === user?._id)
          return sum + (userUnread?.count || 0)
        }, 0)
        setUnreadCount(totalUnread)
      }
    } catch (error) {
      console.error('Failed to load chats:', error)
    }
  }

  const loadMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.data.messages)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const value: SocketContextType = {
    socket,
    isConnected,
    chats,
    currentChat,
    messages,
    unreadCount,
    locationUpdates,
    panicAlerts,
    notifications,
    joinHostelChat,
    joinPrivateChat,
    sendMessage,
    shareLocation,
    sendPanicAlert,
    markMessagesAsRead,
    setCurrentChat,
    loadChats,
    loadMessages
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
