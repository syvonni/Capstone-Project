import { useEffect, useRef, useState } from 'react'
import { Layout, Typography } from 'antd'
import { theme } from 'antd'
import { EditOutlined, CloseOutlined, SaveOutlined } from '@ant-design/icons'
import ConsolidatedProfileNav from '@/features/user/components/layout/ConsolidatedProfileNav'
import ConsolidatedContentRenderer from '@/features/user/components/security/ConsolidatedContentRenderer'
import { CONSOLIDATED_NAV_ITEMS } from '@/features/user/constants'
import { useAuthSession } from '@/features/authentication'
import StaffLayout from '@/shared/components/StaffLayout'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'
import DetailHeader from '@/shared/components/DetailHeader'
import { useEditUserProfileForm } from '@/features/user/hooks/useEditUserProfileForm'

const { Title } = Typography

export default function UserSettingsView() {
  const { currentUser } = useAuthSession()
  const { token } = theme.useToken()
  const [selectedKey, setSelectedKey] = useState('personalInfo')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  
  const { isDirty, handleFinish, resetForm, form, handleValuesChange, profileValues } = useEditUserProfileForm()

  // Determine user role and filter navigation items
  const userRole = typeof currentUser?.role === 'string' ? currentUser?.role : currentUser?.role?.slug || 'business_owner'
  const isBusinessOwner = userRole === 'business_owner'
  const isStaffOrAdmin = userRole === 'staff' || userRole === 'admin'

  // Filter navigation items based on user role
  const getFilteredNavItems = () => {
    let items = [...CONSOLIDATED_NAV_ITEMS]
    
    if (isStaffOrAdmin) {
      // Staff and admin: only security sections (no Personal Information)
      items = items.filter(item => item.key !== 'personalInfo')
    } else if (!isBusinessOwner) {
      // Regular users: Personal Information + security sections (no delete account)
      items = items.filter(item => item.key !== 'deleteAccount')
    }
    // Business owners get all items by default
    
    return items
  }

  const filteredNavItems = getFilteredNavItems()

  // Set default selected key based on available items
  useEffect(() => {
    if (!filteredNavItems.find(item => item.key === selectedKey)) {
      setSelectedKey(filteredNavItems[0]?.key || 'personalInfo')
    }
  }, [selectedKey, filteredNavItems])

  // Exit edit mode when switching tabs
  const previousKeyRef = useRef(selectedKey)
  useEffect(() => {
    if (previousKeyRef.current === selectedKey) return
    previousKeyRef.current = selectedKey
    setIsEditMode(false)
    resetForm()
  }, [selectedKey, resetForm])

  // Handle entering edit mode
  const handleEnterEditMode = () => {
    setIsEditMode(true)
  }

  // Handle exiting edit mode (discard changes)
  const handleExitEditMode = () => {
    setIsEditMode(false)
    resetForm()
  }

  // Handle saving changes
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      await handleFinish(values)
      setIsEditMode(false)
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  // Handle nav item selection - open drawer on mobile
  const handleSelectKey = (key) => {
    setSelectedKey(key)
    setDrawerOpen(true)
  }

  // Get drawer title based on selected key
  const getDrawerTitle = () => {
    const selectedItem = filteredNavItems.find(item => item.key === selectedKey)
    return selectedItem?.label || 'Settings'
  }

  // Left panel content - navigation
  const listContent = (
    <div style={{ 
      height: '100%', 
      padding: '8px 6px',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      background: token.colorBgContainer,
    }}>
      <ConsolidatedProfileNav 
        selectedKey={selectedKey}
        onSelectKey={handleSelectKey}
        navItems={filteredNavItems}
      />
    </div>
  )

  // Get the selected tab label for the detail header
  const selectedTabLabel = filteredNavItems.find(item => item.key === selectedKey)?.label || 'Settings'

  // Right panel content - detail view
  const detailContent = (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      background: token.colorBgContainer
    }}>
      <DetailHeader
        title={selectedTabLabel}
        primaryButton={selectedKey === 'personalInfo' ? {
          text: 'Save',
          icon: <SaveOutlined />,
          onClick: handleSave,
          type: 'primary',
          disabled: !isEditMode || !isDirty,
        } : undefined}
        actionButtons={selectedKey === 'personalInfo' && !isEditMode ? [
          { text: 'Edit', icon: <EditOutlined />, onClick: handleEnterEditMode, type: 'default' }
        ] : selectedKey === 'personalInfo' && isEditMode ? [
          { text: 'Exit Edit Mode', icon: <CloseOutlined />, onClick: handleExitEditMode, type: 'default' }
        ] : []}
      />
      
      {/* Detail Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        padding: 24
      }}>
        <ConsolidatedContentRenderer
          selectedKey={selectedKey}
          isBusinessOwner={isBusinessOwner}
          isStaffOrAdmin={isStaffOrAdmin}
          isEditMode={isEditMode}
          form={form}
          handleValuesChange={handleValuesChange}
          profileValues={profileValues}
        />
      </div>
    </div>
  )

  const content = (
    <ResponsiveSplitLayout
      listContent={listContent}
      detailContent={detailContent}
      drawerTitle={getDrawerTitle()}
      drawerOpen={drawerOpen}
      onDrawerClose={() => setDrawerOpen(false)}
      listMinWidth={260}
      listMaxWidth={300}
      listDefaultSize="260px"
    />
  )

  if (isStaffOrAdmin) {
    return (
      <StaffLayout>
        {content}
      </StaffLayout>
    )
  }

  return (
    <Layout style={{ height: '100%', minHeight: '0 !important' }}>
      {content}
    </Layout>
  )
}
