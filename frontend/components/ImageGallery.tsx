'use client'

import { useState, useEffect } from 'react'
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  MagnifyingGlassPlusIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import Image from 'next/image'

interface ImageGalleryProps {
  images: Array<{
    _id?: string
    url: string
    caption?: string
    isPrimary?: boolean
  }>
  className?: string
  showThumbnails?: boolean
  maxThumbnails?: number
}

export default function ImageGallery({ 
  images = [], 
  className = '', 
  showThumbnails = true,
  maxThumbnails = 4 
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Sort images to show primary first
  const sortedImages = [...images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1
    if (!a.isPrimary && b.isPrimary) return 1
    return 0
  })

  const openLightbox = (index: number) => {
    setSelectedImage(index)
    setIsLightboxOpen(true)
  }

  const closeLightbox = () => {
    setIsLightboxOpen(false)
  }

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % sortedImages.length)
  }

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + sortedImages.length) % sortedImages.length)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isLightboxOpen) return
    
    switch (e.key) {
      case 'Escape':
        closeLightbox()
        break
      case 'ArrowRight':
        nextImage()
        break
      case 'ArrowLeft':
        prevImage()
        break
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isLightboxOpen])

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isLightboxOpen])

  if (!sortedImages.length) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center py-12">
          <PhotoIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No images available</p>
        </div>
      </div>
    )
  }

  const visibleThumbnails = sortedImages.slice(0, maxThumbnails)
  const remainingCount = sortedImages.length - maxThumbnails

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Main Image */}
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={sortedImages[0]?.url || '/placeholder-hostel.jpg'}
            alt={sortedImages[0]?.caption || 'Hostel image'}
            fill
            className="object-cover transition-opacity duration-300"
            onLoad={() => setIsLoading(false)}
            priority
          />
          
          {isLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
              <PhotoIcon className="w-12 h-12 text-gray-400" />
            </div>
          )}

          {/* Overlay with zoom button */}
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
            <button
              onClick={() => openLightbox(0)}
              className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 transition-all duration-200 transform hover:scale-110"
            >
              <MagnifyingGlassPlusIcon className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* Image counter */}
          {sortedImages.length > 1 && (
            <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
              1 / {sortedImages.length}
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {showThumbnails && sortedImages.length > 1 && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {visibleThumbnails.slice(1).map((image, index) => (
              <button
                key={image._id || index}
                onClick={() => openLightbox(index + 1)}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity"
              >
                <Image
                  src={image.url}
                  alt={image.caption || `Thumbnail ${index + 2}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
            
            {/* Show remaining count */}
            {remainingCount > 0 && (
              <button
                onClick={() => openLightbox(maxThumbnails)}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-900 bg-opacity-80 flex items-center justify-center text-white font-semibold hover:bg-opacity-70 transition-all"
              >
                <span className="text-lg">+{remainingCount}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all"
          >
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-60 text-white px-4 py-2 rounded-full">
            {selectedImage + 1} / {sortedImages.length}
          </div>

          {/* Navigation buttons */}
          {sortedImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 transition-all"
              >
                <ChevronLeftIcon className="w-6 h-6 text-white" />
              </button>
              
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 transition-all"
              >
                <ChevronRightIcon className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Main lightbox image */}
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            <div className="relative w-full h-full">
              <Image
                src={sortedImages[selectedImage]?.url || '/placeholder-hostel.jpg'}
                alt={sortedImages[selectedImage]?.caption || 'Hostel image'}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Caption */}
          {sortedImages[selectedImage]?.caption && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-6 py-3 rounded-full max-w-md text-center">
              {sortedImages[selectedImage].caption}
            </div>
          )}

          {/* Thumbnail strip */}
          {sortedImages.length > 1 && (
            <div className="absolute bottom-4 left-4 right-4 flex justify-center">
              <div className="flex space-x-2 bg-black bg-opacity-40 rounded-lg p-2 max-w-md overflow-x-auto scrollbar-hide">
                {sortedImages.map((image, index) => (
                  <button
                    key={image._id || index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative w-16 h-12 rounded overflow-hidden flex-shrink-0 transition-all ${
                      selectedImage === index 
                        ? 'ring-2 ring-white ring-opacity-80' 
                        : 'opacity-60 hover:opacity-80'
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Click outside to close */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={closeLightbox}
          />
        </div>
      )}
    </>
  )
}
