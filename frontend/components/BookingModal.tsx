'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { 
  XMarkIcon, 
  CalendarDaysIcon, 
  UserIcon, 
  CurrencyRupeeIcon,
  ClockIcon,
  PhoneIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { format, addMonths, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import axios from 'axios'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  hostel: any
  onBookingSuccess: (booking: any) => void
}

interface BookingFormData {
  roomType: string
  checkInDate: string
  checkOutDate: string
  duration: number
  foodOptions: {
    selected: boolean
    type: string
    mealPlan: string
  }
  emergencyContact: {
    name: string
    phone: string
    relationship: string
  }
  specialRequests: string
}

export default function BookingModal({ isOpen, onClose, hostel, onBookingSuccess }: BookingModalProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [pricing, setPricing] = useState({
    monthlyRent: 0,
    securityDeposit: 0,
    maintenanceCharges: 0,
    foodCost: 0,
    totalAmount: 0
  })

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<BookingFormData>({
    defaultValues: {
      roomType: hostel?.rooms?.[0]?.type || 'Single',
      checkInDate: format(new Date(), 'yyyy-MM-dd'),
      checkOutDate: format(addMonths(new Date(), 6), 'yyyy-MM-dd'),
      duration: 6,
      foodOptions: {
        selected: false,
        type: 'Veg',
        mealPlan: 'All Meals'
      },
      emergencyContact: {
        name: '',
        phone: '',
        relationship: ''
      },
      specialRequests: ''
    }
  })

  const watchedValues = watch()

  // Calculate pricing when form values change
  useEffect(() => {
    if (hostel && watchedValues.duration) {
      const monthlyRent = hostel.pricing.monthlyRent
      const securityDeposit = hostel.pricing.securityDeposit || 0
      const maintenanceCharges = hostel.pricing.maintenanceCharges || 0
      const foodCost = watchedValues.foodOptions.selected && hostel.foodOptions?.available 
        ? (hostel.foodOptions.monthlyCost * watchedValues.duration) 
        : 0

      const totalAmount = (monthlyRent * watchedValues.duration) + securityDeposit + (maintenanceCharges * watchedValues.duration) + foodCost

      setPricing({
        monthlyRent,
        securityDeposit,
        maintenanceCharges,
        foodCost,
        totalAmount
      })
    }
  }, [hostel, watchedValues.duration, watchedValues.foodOptions.selected])

  // Update duration when dates change
  useEffect(() => {
    if (watchedValues.checkInDate && watchedValues.checkOutDate) {
      const checkIn = new Date(watchedValues.checkInDate)
      const checkOut = new Date(watchedValues.checkOutDate)
      const days = differenceInDays(checkOut, checkIn)
      const months = Math.ceil(days / 30)
      setValue('duration', Math.max(1, months))
    }
  }, [watchedValues.checkInDate, watchedValues.checkOutDate, setValue])

  const onSubmit = async (data: BookingFormData) => {
    try {
      setLoading(true)
      
      const bookingData = {
        hostelId: hostel._id,
        ...data
      }

      const response = await axios.post('/bookings', bookingData)
      
      if (response.data.success) {
        toast.success('Booking request submitted successfully!')
        onBookingSuccess(response.data.data.booking)
        onClose()
        reset()
        setStep(1)
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create booking'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step < 3) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Book Your Stay</h2>
              <p className="text-gray-600 mt-1">{hostel?.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {stepNumber}
                  </div>
                  <span className={`ml-2 text-sm ${
                    step >= stepNumber ? 'text-primary-600' : 'text-gray-500'
                  }`}>
                    {stepNumber === 1 ? 'Dates & Room' : stepNumber === 2 ? 'Details' : 'Review'}
                  </span>
                  {stepNumber < 3 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      step > stepNumber ? 'bg-primary-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6">
              {/* Step 1: Dates & Room */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="label">
                        <CalendarDaysIcon className="w-4 h-4 mr-2" />
                        Check-in Date
                      </label>
                      <input
                        type="date"
                        {...register('checkInDate', { required: 'Check-in date is required' })}
                        className="input"
                        min={format(new Date(), 'yyyy-MM-dd')}
                      />
                      {errors.checkInDate && (
                        <p className="text-sm text-red-600 mt-1">{errors.checkInDate.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="label">
                        <CalendarDaysIcon className="w-4 h-4 mr-2" />
                        Check-out Date
                      </label>
                      <input
                        type="date"
                        {...register('checkOutDate', { required: 'Check-out date is required' })}
                        className="input"
                        min={watchedValues.checkInDate}
                      />
                      {errors.checkOutDate && (
                        <p className="text-sm text-red-600 mt-1">{errors.checkOutDate.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="label">
                        <UserGroupIcon className="w-4 h-4 mr-2" />
                        Room Type
                      </label>
                      <select {...register('roomType')} className="input">
                        {hostel?.rooms?.map((room: any) => (
                          <option key={room.type} value={room.type} disabled={room.availableRooms <= 0}>
                            {room.type} - {room.availableRooms > 0 ? `${room.availableRooms} available` : 'Not available'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">
                        <ClockIcon className="w-4 h-4 mr-2" />
                        Duration (Months)
                      </label>
                      <input
                        type="number"
                        {...register('duration', { 
                          required: 'Duration is required',
                          min: { value: 1, message: 'Minimum duration is 1 month' }
                        })}
                        className="input"
                        min="1"
                      />
                      {errors.duration && (
                        <p className="text-sm text-red-600 mt-1">{errors.duration.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Food Options */}
                  {hostel?.foodOptions?.available && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-4">
                        <input
                          type="checkbox"
                          {...register('foodOptions.selected')}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-900">
                          Add Food Plan (₹{hostel.foodOptions.monthlyCost}/month)
                        </label>
                      </div>

                      {watchedValues.foodOptions.selected && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="label">Food Type</label>
                            <select {...register('foodOptions.type')} className="input">
                              <option value="Veg">Vegetarian</option>
                              <option value="Non-Veg">Non-Vegetarian</option>
                              <option value="Both">Both</option>
                            </select>
                          </div>
                          <div>
                            <label className="label">Meal Plan</label>
                            <select {...register('foodOptions.mealPlan')} className="input">
                              <option value="Breakfast Only">Breakfast Only</option>
                              <option value="Lunch Only">Lunch Only</option>
                              <option value="Dinner Only">Dinner Only</option>
                              <option value="Breakfast + Dinner">Breakfast + Dinner</option>
                              <option value="All Meals">All Meals</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Details */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">
                          <UserIcon className="w-4 h-4 mr-2" />
                          Name
                        </label>
                        <input
                          type="text"
                          {...register('emergencyContact.name', { required: 'Emergency contact name is required' })}
                          className="input"
                          placeholder="Full name"
                        />
                        {errors.emergencyContact?.name && (
                          <p className="text-sm text-red-600 mt-1">{errors.emergencyContact.name.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="label">
                          <PhoneIcon className="w-4 h-4 mr-2" />
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          {...register('emergencyContact.phone', { 
                            required: 'Phone number is required',
                            pattern: {
                              value: /^[6-9]\d{9}$/,
                              message: 'Please enter a valid phone number'
                            }
                          })}
                          className="input"
                          placeholder="10-digit phone number"
                        />
                        {errors.emergencyContact?.phone && (
                          <p className="text-sm text-red-600 mt-1">{errors.emergencyContact.phone.message}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="label">Relationship</label>
                        <select {...register('emergencyContact.relationship')} className="input">
                          <option value="">Select relationship</option>
                          <option value="Parent">Parent</option>
                          <option value="Guardian">Guardian</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Friend">Friend</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label">Special Requests (Optional)</label>
                    <textarea
                      {...register('specialRequests')}
                      className="input"
                      rows={3}
                      placeholder="Any special requirements or requests..."
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check-in:</span>
                        <span className="font-medium">{format(new Date(watchedValues.checkInDate), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check-out:</span>
                        <span className="font-medium">{format(new Date(watchedValues.checkOutDate), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Room Type:</span>
                        <span className="font-medium">{watchedValues.roomType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{watchedValues.duration} months</span>
                      </div>
                      {watchedValues.foodOptions.selected && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Food Plan:</span>
                          <span className="font-medium">{watchedValues.foodOptions.mealPlan} ({watchedValues.foodOptions.type})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-primary-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CurrencyRupeeIcon className="w-5 h-5 mr-2" />
                      Pricing Breakdown
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly Rent × {watchedValues.duration}</span>
                        <span>₹{(pricing.monthlyRent * watchedValues.duration).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Security Deposit</span>
                        <span>₹{pricing.securityDeposit.toLocaleString()}</span>
                      </div>
                      {pricing.maintenanceCharges > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Maintenance × {watchedValues.duration}</span>
                          <span>₹{(pricing.maintenanceCharges * watchedValues.duration).toLocaleString()}</span>
                        </div>
                      )}
                      {pricing.foodCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Food Plan × {watchedValues.duration}</span>
                          <span>₹{pricing.foodCost.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-300 pt-3">
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Total Amount</span>
                          <span className="text-primary-600">₹{pricing.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <div className="flex space-x-3">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="btn-outline"
                  >
                    Previous
                  </button>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-outline"
                >
                  Cancel
                </button>
                
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? 'Creating Booking...' : 'Submit Booking Request'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
