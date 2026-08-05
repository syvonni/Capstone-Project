import VariablesMonitoring from './components/VariablesMonitoring'

export default function AdminDashboard() {
  return (
    <div style={{ width: '100%', padding: 16, boxSizing: 'border-box' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '16px',
        width: '100%',
      }}>
        <VariablesMonitoring />
        <VariablesMonitoring />
      </div>
    </div>
  )
}
