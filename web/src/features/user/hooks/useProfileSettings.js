import { useState, useEffect } from 'react'
import { message } from 'antd'
import useProfile from '@/features/authentication/hooks/useProfile'
import { useAuthSession } from '@/features/authentication'
import { getOffices, resolveOfficeLabel } from '@/shared/services/officeService'
import { usePasskeyStatus } from '@/features/user/hooks/usePasskeyStatus'

export function useProfileSettings() {
  const { user } = useProfile()
  const { currentUser, role } = useAuthSession()
  const [messageApi, contextHolder] = message.useMessage()
  const [selectedTab, setSelectedTab] = useState('general')
  const [offices, setOffices] = useState([])
  const [settingsLastUpdated, setSettingsLastUpdated] = useState(null)
  const [settingsInfoOpen, setSettingsInfoOpen] = useState(false)

  const roleSlug = String(role?.slug || role || '').toLowerCase()
  const isStaffRole = ['lgu_officer', 'inspector', 'staff'].includes(roleSlug)
  const isAdmin = roleSlug === 'admin'
  const isBusinessOwner = roleSlug === 'business_owner'

  const { passkeyEnabled, passkeyLoading } = usePasskeyStatus(currentUser)

  useEffect(() => {
    if (isAdmin) setSettingsLastUpdated(new Date())
  }, [isAdmin])

  useEffect(() => {
    let mounted = true
    if (isStaffRole) {
      getOffices()
        .then((list) => {
          if (mounted) setOffices(Array.isArray(list) ? list : [])
        })
        .catch(() => {
          if (mounted) setOffices([])
        })
    }
    return () => { mounted = false }
  }, [isStaffRole])

  const officeLabel = resolveOfficeLabel(currentUser?.office, offices)

  return {
    user,
    currentUser,
    role,
    messageApi,
    contextHolder,
    selectedTab,
    setSelectedTab,
    passkeyEnabled,
    passkeyLoading,
    offices,
    officeLabel,
    isStaffRole,
    isAdmin,
    isBusinessOwner,
    settingsLastUpdated,
    setSettingsLastUpdated,
    settingsInfoOpen,
    setSettingsInfoOpen,
  }
}
