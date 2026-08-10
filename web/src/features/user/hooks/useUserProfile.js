import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthSession } from '@/features/authentication'
import { profileService } from '@/features/user/services'
import { useNotifier } from '@/shared/notifications.js'
import dayjs from 'dayjs'

/**
 * useUserProfile Hook
 * Single source of truth for profile data with proper error handling and caching
 */
export function useUserProfile() {
  const { currentUser, role } = useAuthSession()
  const { error } = useNotifier()
  
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadProfile = useCallback(async () => {
    if (!currentUser) {
      setProfile(null)
      return
    }

    setLoading(true)
    setLocalError(null)
    
    try {
      const data = await profileService.getProfile(currentUser, role)
      setProfile(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load profile:', err)
      setLocalError(err)
      error(err, 'Failed to load profile')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [currentUser, role, error])

  const refresh = useCallback(() => {
    return loadProfile()
  }, [loadProfile])

  // Auto-load profile when user changes
  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Memoized profile data accessors
  const profileData = useMemo(() => {
    if (!profile) return null

    return {
      // Basic info
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      middleName: profile.middleName || '',
      suffix: profile.suffix || '',
      email: profile.email || '',
      phoneNumber: profile.phoneNumber || '09',
      
      // PIS info (business owner only)
      sex: profile.sex,
      dateOfBirth: profile.dateOfBirth ? dayjs(profile.dateOfBirth) : null,
      maritalStatus: profile.maritalStatus,
      placeOfBirth: profile.placeOfBirth || '',
      nationality: profile.nationality || '',
      fatherName: profile.fatherName || '',
      motherName: profile.motherName || '',
      distinctiveMark: profile.distinctiveMark || '',
      highestEducationalAttainment: profile.highestEducationalAttainment,
      
      // Address
      address: profile.address ? {
        street: profile.address.street || '',
        barangay: profile.address.barangay || '',
        city: profile.address.city || '',
        province: profile.address.province || '',
        zipCode: profile.address.zipCode || '',
        provinceName: profile.address.provinceName || '',
        cityName: profile.address.cityName || '',
        barangayName: profile.address.barangayName || '',
      } : null,
    }
  }, [profile])

  return {
    // Raw data
    profile,
    loading,
    error: localError,
    lastUpdated,
    
    // Processed data
    profileData,
    
    // Actions
    refresh,
    loadProfile,
  }
}