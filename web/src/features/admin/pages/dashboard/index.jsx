import { Grid } from 'antd'
import VariablesDashboardCard from './components/VariablesDashboardCard'
import ViolationsDashboardCard from './components/ViolationsDashboardCard'
import InspectionItemsDashboardCard from './components/InspectionItemsDashboardCard'
import ChecklistsDashboardCard from './components/ChecklistsDashboardCard'
import PostRequirementsDashboardCard from './components/PostRequirementsDashboardCard'
import LOBDashboardCard from './components/LOBDashboardCard'

const { useBreakpoint } = Grid

export default function AdminDashboard() {
  const screens = useBreakpoint()

  const getGridColumns = () => {
    if (screens.lg) return 3
    if (screens.md) return 2
    return 1
  }

  return (
    <div style={{ width: '100%', padding: 16, boxSizing: 'border-box' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`,
        gap: '16px',
        width: '100%',
      }}>
        <VariablesDashboardCard />
        <ViolationsDashboardCard />
        <InspectionItemsDashboardCard />
        <ChecklistsDashboardCard />
        <PostRequirementsDashboardCard />
        <LOBDashboardCard />
      </div>
    </div>
  )
}
