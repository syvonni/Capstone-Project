import { useState, useCallback, useMemo, useEffect } from 'react'
import { Modal, Select, Button, Typography, message, Grid, Drawer, theme } from 'antd'
import { useStepUp } from '@/shared/hooks/useStepUp'
import PanelCard from '@/shared/components/PanelCard'
import InfoGrid from '@/shared/components/InfoGrid'
import ListPanel from '@/shared/components/ListPanel'
import BusinessOwnerService from '@/features/staffs/lgu-officer/services/businessOwnerService'
import { PermitApplicationService } from '@/features/staffs/lgu-officer/services/permitApplicationService'
import dayjs from 'dayjs'

const { Text, Title } = Typography
const { useBreakpoint } = Grid
const { useToken } = theme

const { Option } = Select

const PERMIT_TYPES = [
  { value: 'permit', label: 'Unified Business Permit' },
  { value: 'general_permit-cooperative', label: 'Cooperative' },
  { value: 'general_permit-association_foundation', label: 'Association / Foundation' },
  { value: 'general_permit-chainsaw', label: 'Chainsaw Permit' },
  { value: 'general_permit-firecrackers_stallholders', label: 'Firecrackers Stallholders' },
  { value: 'general_permit-bazaar_festival_vendors', label: 'Bazaar / Festival Vendors' },
  { value: 'general_permit-peddlers', label: 'Peddlers' },
  { value: 'general_permit-promotional_temporary_stalls', label: 'Promotional / Temporary Stalls' },
  { value: 'general_permit-market_stallholders', label: 'Market Stallholders' },
  { value: 'general_permit-fishpond', label: 'Fishpond Permit' },
  { value: 'general_permit-sand_gravel', label: 'Sand and Gravel Permit' },
  { value: 'general_permit-warehouse_storage', label: 'Warehouse / Storage Facility' },
  { value: 'general_permit-other', label: 'Other' },
]

export default function WalkInApplicationModal({ open, onClose, onApplicationSelect }) {
  const screens = useBreakpoint()
  const { token } = useToken()
  const [step, setStep] = useState('select_owner')
  const [loading, setLoading] = useState(false)
  const [businessOwners, setBusinessOwners] = useState([])
  const [businessOwnersLoading, setBusinessOwnersLoading] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [permitType, setPermitType] = useState(null)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })
  const isMobile = !screens.lg
  const { runWithStepUp, stepUpModal } = useStepUp()

  const businessOwnerService = useMemo(() => new BusinessOwnerService(), [])
  const permitApplicationService = useMemo(() => new PermitApplicationService(), [])

  const fetchBusinessOwners = useCallback(async () => {
    setBusinessOwnersLoading(true)
    try {
      const searchParams = {
        page: pagination.page,
        limit: pagination.limit,
      }
      if (search) {
        searchParams.search = search
      }
      const response = await businessOwnerService.getBusinessOwners({}, searchParams)
      const owners = response?.data || response?.businessOwners || []
      const total = response?.total || 0
      setBusinessOwners(owners)
      setPagination(prev => ({ ...prev, total }))
    } catch (err) {
      console.error('Failed to fetch business owners:', err)
      message.error('Failed to load business owners')
    } finally {
      setBusinessOwnersLoading(false)
    }
  }, [businessOwnerService, pagination.page, pagination.limit, search])

  // Fetch business owners when modal opens and reset pagination
  useEffect(() => {
    if (open && step === 'select_owner') {
      setPagination({ page: 1, limit: 20, total: 0 })
      setSearch('')
      fetchBusinessOwners()
    }
  }, [open, step, fetchBusinessOwners])

  const handleOwnerSelect = (owner) => {
    setSelectedOwner(owner)
    setStep('confirm_create')
  }

  const handleBack = () => {
    setSelectedOwner(null)
    setPermitType(null)
    setStep('select_owner')
  }

  const getItemId = useCallback((item) => {
    return item._id || item.userId || item.id
  }, [])

  const renderCard = (owner, currentSelectedId, onSelect) => {
    const ownerId = getItemId(owner)
    const createdDate = owner.createdAt ? dayjs(owner.createdAt).format('MMMM D, YYYY') : null
    const lastLoginDate = owner.lastLoginAt ? dayjs(owner.lastLoginAt).format('MMMM D, YYYY') : null

    const fullName = [owner.firstName, owner.middleName, owner.lastName, owner.suffix].filter(Boolean).join(' ')
    
    let statusLabel = owner.accountStatus || 'pending_setup'
    let statusColor = 'default'
    switch (statusLabel) {
      case 'active':
        statusLabel = 'Active'
        statusColor = 'green'
        break
      case 'pending_setup':
        statusLabel = 'Pending Setup'
        statusColor = 'orange'
        break
      case 'suspended':
        statusLabel = 'Suspended'
        statusColor = 'red'
        break
      case 'locked':
        statusLabel = 'Locked'
        statusColor = 'red'
        break
      default:
        statusLabel = 'Unknown'
        statusColor = 'default'
    }
    if (owner.deletionPending) {
      statusLabel = 'Pending Deletion'
      statusColor = 'orange'
    }

    const tags = [
      { label: statusLabel, color: statusColor },
    ]
    if (owner.email) {
      tags.push({ label: owner.email.toLowerCase(), color: 'default', textTransform: 'none' })
    }
    if (owner.businessCount !== undefined) {
      tags.push({ label: `${owner.businessCount} business${owner.businessCount !== 1 ? 'es' : ''}`, color: 'default' })
    }
    const applicationCount = owner.applicationCount || 0
    tags.push({ label: `${applicationCount} application${applicationCount !== 1 ? 's' : ''}`, color: 'default' })

    const metaInfo = []
    if (createdDate) {
      metaInfo.push({ label: 'Registered on', value: createdDate })
    }
    if (lastLoginDate) {
      metaInfo.push({ label: 'Last logged in', value: lastLoginDate })
    }

    return (
      <PanelCard
        key={ownerId}
        item={owner}
        selected={currentSelectedId === ownerId}
        onClick={() => onSelect(owner)}
        title={fullName || owner.fullName || owner.name || 'Unnamed Owner'}
        description=""
        metaInfo={metaInfo}
        tags={tags}
      />
    )
  }

  const handleCreateApplication = async () => {
    if (!selectedOwner || !permitType) {
      message.error('Please select a business owner and permit type')
      return
    }

    try {
      setLoading(true)
      
      // Parse permit type and category
      const [type, category] = permitType.split('-')
      
      await runWithStepUp(async (stepUpToken) => {
        const response = await permitApplicationService.createWalkInApplication({
          ownerId: selectedOwner._id || selectedOwner.id,
          permitType: type,
          category: category || null,
          stepUpToken
        })
        
        message.success('Walk-in application created successfully')
        onClose()
        
        if (onApplicationSelect && response?.application) {
          onApplicationSelect(response.application)
        }
      })
    } catch (err) {
      if (err?.message !== 'Step-up cancelled') {
        console.error('Failed to create walk-in application:', err)
        const errorMessage = err?.response?.data?.message || err?.message || 'Failed to create walk-in application'
        message.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    setSelectedOwner(null)
    setPermitType(null)
    setStep('select_owner')
    onClose()
  }

  // Format owner info for InfoGrid
  const toSentenceCase = (str) => {
    if (!str) return 'N/A'
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const getOwnerInfoItems = () => {
    if (!selectedOwner) return []
    
    const addressParts = [
      selectedOwner?.address?.street,
      selectedOwner?.address?.barangay,
      selectedOwner?.address?.city,
      selectedOwner?.address?.province,
      selectedOwner?.address?.zipCode,
    ].filter(Boolean)
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A'

    return [
      { label: 'Name', value: [selectedOwner?.firstName, selectedOwner?.middleName, selectedOwner?.lastName, selectedOwner?.suffix].filter(Boolean).join(' ') || 'N/A' },
      { label: 'Email', value: selectedOwner?.email || 'N/A' },
      { label: 'Phone Number', value: selectedOwner?.phoneNumber || 'N/A' },
      { label: 'Sex', value: selectedOwner?.sex ? (selectedOwner.sex === 'male' ? 'Male' : selectedOwner.sex === 'female' ? 'Female' : selectedOwner.sex) : 'N/A' },
      { label: 'Date of Birth', value: selectedOwner?.dateOfBirth ? new Date(selectedOwner.dateOfBirth).toLocaleDateString() : 'N/A' },
      { label: 'Marital Status', value: toSentenceCase(selectedOwner?.maritalStatus) },
      { type: 'divider' },
      { label: 'Address', value: fullAddress },
    ]
  }

  // Step 1: Select Business Owner
  const step1Content = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 0 }}>
        {/* Step Indicator */}
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Step 1 of 2
        </Text>

        <Text style={{ display: 'block', marginBottom: 24 }}>
          Select the business owner you are creating this application for.
        </Text>

        <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, overflow: 'hidden' }}>
          <ListPanel
            items={businessOwners}
            isLoading={businessOwnersLoading}
            selectedId={selectedOwner?._id}
            onSelectItem={handleOwnerSelect}
            renderCard={renderCard}
            searchPlaceholder="Search business owners..."
            searchValue={search}
            onSearchChange={(value) => {
              setSearch(value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onChange: (page) => setPagination(prev => ({ ...prev, page })),
            }}
            showRefresh={true}
            onRefresh={fetchBusinessOwners}
          />
        </div>
      </div>
    </div>
  )

  // Step 2: Confirm & Create
  const step2Content = (
    <div style={{ padding: 16 }}>
      {/* Step Indicator */}
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Step 2 of 2
      </Text>

      <Text style={{ display: 'block', marginBottom: 24 }}>
        Review the business owner&apos;s information and select the permit type for this application.
      </Text>

      <InfoGrid items={getOwnerInfoItems()} />

      <div style={{ marginTop: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          Permit Type <span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
        </Text>
        <Select
          placeholder="Select permit type"
          style={{ width: '100%' }}
          value={permitType}
          onChange={setPermitType}
        >
          {PERMIT_TYPES.map((type) => (
            <Option key={type.value} value={type.value}>
              {type.label}
            </Option>
          ))}
        </Select>
      </div>
    </div>
  )

  const content = step === 'select_owner' ? step1Content : step2Content

  const footerContent = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      {step === 'confirm_create' && (
        <Button onClick={handleBack}>
          Back
        </Button>
      )}
      {step === 'confirm_create' && (
        <Button 
          type="primary" 
          onClick={handleCreateApplication} 
          loading={loading}
          disabled={!permitType}
        >
          Create Application
        </Button>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <>
        <Drawer
          open={open}
          onClose={handleModalClose}
          title="Walk-In Application"
          placement="bottom"
          height="auto"
          styles={{ body: { padding: 0 } }}
          destroyOnHidden
        >
          {content}
          <div style={{ padding: 16, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {step === 'confirm_create' && (
              <Button onClick={handleBack}>
                Back
              </Button>
            )}
            {step === 'confirm_create' && (
              <Button 
                type="primary" 
                onClick={handleCreateApplication} 
                loading={loading}
                disabled={!permitType}
              >
                Create Application
              </Button>
            )}
          </div>
        </Drawer>
        {stepUpModal}
      </>
    )
  }

  return (
    <>
      <Modal
        open={open}
        onCancel={handleModalClose}
        title="Walk-In Application"
        footer={footerContent}
        width={600}
        destroyOnHidden
      >
        {content}
      </Modal>
      {stepUpModal}
    </>
  )
}
