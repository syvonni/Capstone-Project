import { Layout, Button, Typography, Space, Grid, theme } from 'antd'
import AnimatedBrandLogo from '@/shared/components/graphics/AnimatedBrandLogo.jsx'

const { Header } = Layout
const { Title } = Typography
const { useBreakpoint } = Grid

export default function HomeHeader({ visible = true, onNavigate, fadingOut = false }) {
  const screens = useBreakpoint()
  const { token } = theme.useToken()
  
  return (
    <Header style={{
      background: token.colorBgContainer,
      borderBottom: `1px solid ${token.colorBorder}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: screens.md ? '0 48px' : '0 16px',
      height: screens.md ? '72px' : '64px',
      lineHeight: 'normal',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      opacity: fadingOut ? 0 : (visible ? 1 : 0),
      transform: fadingOut ? 'translateY(-20px)' : (visible ? 'translateY(0)' : 'translateY(-20px)'),
      transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
      pointerEvents: fadingOut ? 'none' : 'auto',
      overflow: 'hidden',
    }}>
      <AnimatedBrandLogo
        size={screens.md ? 40 : 32}
        showBrandName={true}
        onClick={() => onNavigate?.('/')}
      />
      <Space size={screens.sm ? 'middle' : 'small'}>
        <Button onClick={() => window.location.href = '/login'}>Log In</Button>
        <Button type="primary" onClick={() => window.location.href = '/sign-up'}>{screens.sm ? 'Apply Now' : 'Apply'}</Button>
      </Space>
    </Header>
  )
}
