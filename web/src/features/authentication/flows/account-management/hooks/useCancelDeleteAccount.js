import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthSession } from "@/features/authentication"
import { useAuthNotification, useNotifier } from '@/shared/notifications.js'
import { cancelAccountDeletion } from "@/features/authentication/services/authService"

export function useCancelDeleteAccount({ onSubmit } = {}) {
  const { notificationSuccess } = useAuthNotification()
  const { error } = useNotifier()
  const { login, currentUser } = useAuthSession()
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const cancel = async () => {
    setIsLoading(true)
    try {
      const data = await cancelAccountDeletion()
      let user = data?.user || null
      if (user) {
        // Preserve existing user data (role, token, etc.) and merge with updates
        if (currentUser) {
          const previousRole = currentUser.role
          user = { ...currentUser, ...user }
          
          // Fix: If the API returns the role as an ObjectId string (instead of populated object/slug),
          // we should restore the populated role from currentUser to ensure routing works.
          // We check if the new role is just a string that looks like an ID (long, no spaces) 
          // and doesn't match known role slugs.
          const newRoleStr = String(user.role?.slug || user.role || '')
          const oldRoleStr = String(previousRole?.slug || previousRole || '')
          
          // If new role looks invalid/raw-ID but old one was valid, keep the old one
          const knownRoles = ['admin', 'business_owner', 'staff', 'lgu_officer', 'inspector']
          const isNewValid = knownRoles.includes(newRoleStr.toLowerCase())
          const isOldValid = knownRoles.includes(oldRoleStr.toLowerCase())
          
          if (!isNewValid && isOldValid) {
            user.role = previousRole
          }
        }
        
        // Double check token preservation
        if (!user.token && currentUser?.token) {
          user.token = currentUser.token
        }
        
        try { login(user, { remember: true }) } catch (err) { void err }
      }
      notificationSuccess('Account deletion cancelled', 'Your account is no longer scheduled for deletion.')
      if (typeof onSubmit === 'function') onSubmit(data)

      // Explicitly navigate to the correct dashboard based on role
      // This is more reliable than waiting for ProtectedRoute to react
      const roleKey = String(user?.role?.slug || user?.role || '').toLowerCase()
      const staffRoles = ['staff', 'lgu_officer', 'inspector']

      let target = '/owner'
      if (roleKey === 'admin') target = '/admin/dashboard'
      else if (roleKey === 'business_owner') target = '/owner'
      else if (staffRoles.includes(roleKey)) target = '/staff'

      navigate(target, { replace: true })
      
      return data
    } catch (err) {
      console.error('Cancel delete account error:', err)
      error(err, 'Failed to cancel account deletion')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { cancel, isLoading }
}