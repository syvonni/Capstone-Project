import { Empty } from 'antd'

/**
 * PermitDetailPanelContent
 * 
 * Main content area for the permit processing detail panel.
 * Currently empty - will contain permit printing interface in future phases.
 * 
 * TODO: Implement permit printing interface
 * TODO: Add permit type selection and configuration
 * TODO: Add print preview functionality
 * TODO: Add print action buttons
 */
export default function PermitDetailPanelContent({ permit }) {
  if (!permit) {
    return <Empty description="Select a permit to view details" />
  }

  return (
    <div style={{ padding: 24 }}>
      <Empty description="Permit processing details coming soon" />
    </div>
  )
}
