import { Outlet } from 'react-router-dom'
import StaffLayout from '@/shared/components/StaffLayout'
import { OfficerDataProvider } from '../contexts/OfficerDataContext'

export default function OfficerDashboard() {
  return (
    <OfficerDataProvider>
      <StaffLayout
        hideSidebar={false}
        _noContentWrap
      >
        <Outlet />
      </StaffLayout>
    </OfficerDataProvider>
  )
}
