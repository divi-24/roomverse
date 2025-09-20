'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const ThemeToggle = dynamic(() => import('@/components/ThemeToggle').then(mod => ({ default: mod.ThemeToggle })), {
  ssr: false,
  loading: () => <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
})
import { 
  MagnifyingGlassIcon, 
  MapPinIcon, 
  FunnelIcon,
  StarIcon,
  WifiIcon,
  TruckIcon,
  ShieldCheckIcon,
  HomeIcon,
  SparklesIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'
import Image from 'next/image'

interface Hostel {
  _id: string
  name: string
  description: string
  address: {
    city: string
    state: string
    street: string
  }
  pricing: {
    monthlyRent: number
    securityDeposit: number
  }
  facilities: {
    wifi: boolean
    parking: boolean
    security: boolean
    gym: boolean
    laundry: boolean
  }
  averageRating: number
  totalReviews: number
  images: Array<{
    url: string
    isPrimary: boolean
  }>
  distance?: number
}

export default function HostelsPage() {
  const [hostels, setHostels] = useState<Hostel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    city: '',
    minPrice: '',
    maxPrice: '',
    facilities: [] as string[],
    foodAvailable: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalHostels: 0
  })

  const searchParams = useSearchParams()

  useEffect(() => {
    const city = searchParams.get('city')
    const query = searchParams.get('q')
    
    if (city) setFilters(prev => ({ ...prev, city }))
    if (query) setSearchQuery(query)
    
    fetchHostels()
  }, [searchParams])

  const fetchHostels = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...filters,
        facilities: filters.facilities.join(','),
        ...(searchQuery && { q: searchQuery })
      })

      const response = await fetch(`/api/hostels?${params}`)
      const data = await response.json()

      if (data.success) {
        setHostels(data.data.hostels)
        setPagination(data.data.pagination)
      }
    } catch (error) {
      console.error('Error fetching hostels:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchHostels(1)
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleFacilityToggle = (facility: string) => {
    setFilters(prev => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility]
    }))
  }

  const applyFilters = () => {
    fetchHostels(1)
    setShowFilters(false)
  }

  const clearFilters = () => {
    setFilters({
      city: '',
      minPrice: '',
      maxPrice: '',
      facilities: [],
      foodAvailable: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
    setSearchQuery('')
    fetchHostels(1)
  }

  const getFacilityIcon = (facility: string) => {
    switch (facility) {
      case 'wifi': return <WifiIcon className="w-4 h-4" />
      case 'parking': return <TruckIcon className="w-4 h-4" />
      case 'security': return <ShieldCheckIcon className="w-4 h-4" />
      default: return <HomeIcon className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                  <BuildingOfficeIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                    Find Your Perfect Hostel
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Discover verified hostels with detailed information and reviews
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle size="md" />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-outline flex items-center gap-2"
              >
                <FunnelIcon className="w-4 h-4" />
                Filters
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-8">
            <div className="relative max-w-2xl">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by hostel name, location, or facilities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-32 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-primary px-6"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="lg:w-80">
              <div className="card p-6 sticky top-4 animate-slide-left">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Location */}
                  <div>
                    <label className="label">City</label>
                    <input
                      type="text"
                      placeholder="Enter city"
                      value={filters.city}
                      onChange={(e) => handleFilterChange('city', e.target.value)}
                      className="input"
                    />
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="label">Price Range (₹)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                        className="input"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>

                  {/* Facilities */}
                  <div>
                    <label className="label">Facilities</label>
                    <div className="space-y-2">
                      {['wifi', 'parking', 'security', 'gym', 'laundry'].map((facility) => (
                        <label key={facility} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={filters.facilities.includes(facility)}
                            onChange={() => handleFacilityToggle(facility)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm capitalize">{facility}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Food Availability */}
                  <div>
                    <label className="label">Food Available</label>
                    <select
                      value={filters.foodAvailable}
                      onChange={(e) => handleFilterChange('foodAvailable', e.target.value)}
                      className="input"
                    >
                      <option value="">All</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="label">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="input"
                    >
                      <option value="createdAt">Newest First</option>
                      <option value="pricing.monthlyRent">Price: Low to High</option>
                      <option value="-pricing.monthlyRent">Price: High to Low</option>
                      <option value="averageRating">Rating: High to Low</option>
                    </select>
                  </div>

                  <button onClick={applyFilters} className="btn-primary w-full">
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hostels Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="card p-0 overflow-hidden">
                    <div className="skeleton h-48 w-full"></div>
                    <div className="p-4 space-y-3">
                      <div className="skeleton h-4 w-3/4"></div>
                      <div className="skeleton h-3 w-full"></div>
                      <div className="skeleton h-3 w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : hostels.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-gray-600">
                    Showing {hostels.length} of {pagination.totalHostels} hostels
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hostels.map((hostel, index) => (
                    <Link key={hostel._id} href={`/hostels/${hostel._id}`}>
                      <div className="card-hover p-0 overflow-hidden cursor-pointer group animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                        {/* Image */}
                        <div className="relative h-48 w-full overflow-hidden">
                          <Image
                            src={hostel.images.find(img => img.isPrimary)?.url || hostel.images[0]?.url || '/placeholder-hostel.jpg'}
                            alt={hostel.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                          {hostel.distance && (
                            <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
                              {hostel.distance} km
                            </div>
                          )}
                          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-2 py-1 rounded-full">
                            <StarIconSolid className="w-3 h-3 text-yellow-400" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {hostel.averageRating.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 text-lg">
                              {hostel.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                            <MapPinIcon className="w-4 h-4" />
                            <span>{hostel.address.city}, {hostel.address.state}</span>
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4 leading-relaxed">
                            {hostel.description}
                          </p>

                          {/* Facilities */}
                          <div className="flex items-center gap-3 mb-4">
                            {hostel.facilities.wifi && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                <WifiIcon className="w-3 h-3" />
                                <span>WiFi</span>
                              </div>
                            )}
                            {hostel.facilities.parking && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                <TruckIcon className="w-3 h-3" />
                                <span>Parking</span>
                              </div>
                            )}
                            {hostel.facilities.security && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                <ShieldCheckIcon className="w-3 h-3" />
                                <span>Security</span>
                              </div>
                            )}
                          </div>

                          {/* Price and Reviews */}
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xl font-bold text-gradient-primary">
                                ₹{hostel.pricing.monthlyRent.toLocaleString()}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">/month</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {hostel.totalReviews} reviews
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => fetchHostels(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      className="btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    <span className="px-4 py-2 text-sm text-gray-600">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    
                    <button
                      onClick={() => fetchHostels(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className="btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <HomeIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">No hostels found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  We couldn't find any hostels matching your criteria. Try adjusting your search or filters.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={clearFilters} className="btn-primary">
                    Clear Filters
                  </button>
                  <button onClick={() => setSearchQuery('')} className="btn-outline">
                    Clear Search
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
