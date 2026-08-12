import { Layout, theme } from 'antd'
import HomeHeader from '../components/HomeHeader'
import HeroSection from '../components/HeroSection'
import TransparencyDashboard from '../components/TransparencyDashboard'
import FaqSection from '../components/FaqSection'
import ApplicationProcessSection from '../components/ApplicationProcessSection'
import OfficeLocationSection from '../components/OfficeLocationSection'
import HomeFooter from '../components/HomeFooter'
import useLandingData from '../hooks/useLandingData.jsx'
import BlurFade from '@/shared/components/animations/BlurFade.jsx'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const { Content } = Layout

export default function Home() {
  const { token } = theme.useToken()
  const [showHeader, setShowHeader] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [headerFadingOut, setHeaderFadingOut] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const navigateWithFade = useCallback((path) => {
    // Don't fade if navigating to the same route
    if (location.pathname === path) {
      navigate(path)
      return
    }
    setIsExiting(true)
    setHeaderFadingOut(true)
    setTimeout(() => {
      navigate(path)
    }, 300)
  }, [navigate, location.pathname])

  const {
    announcements,
    maintenanceStatus,
    publicStats,
    announcementItems,
    hasAnnouncementPanel,
    defaultOpenKey,
  } = useLandingData()

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.querySelector('[data-hero-section]')
      if (heroSection) {
        const heroBottom = heroSection.getBoundingClientRect().bottom
        setShowHeader(heroBottom <= 0)
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial state

    return () => window.removeEventListener('scroll', handleScroll)
  }, [isExiting])
  
  return (
    <>
      <HomeHeader visible={showHeader} onNavigate={navigateWithFade} fadingOut={headerFadingOut} />
      <Layout style={{
        minHeight: '100vh',
        background: token.colorBgContainer,
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
      }}>
      <Content style={{ display: 'flex', flexDirection: 'column' }}>
        <HeroSection
          announcements={announcements}
          announcementItems={announcementItems}
          maintenanceStatus={maintenanceStatus}
          hasAnnouncementPanel={hasAnnouncementPanel}
          defaultOpenKey={defaultOpenKey}
          onNavigate={navigateWithFade}
        />
        <BlurFade delay={0.2} duration={0.5} triggerOnViewport>
          <ApplicationProcessSection />
        </BlurFade>
        <BlurFade delay={0.3} duration={0.5} triggerOnViewport>
          <OfficeLocationSection />
        </BlurFade>
        <div style={{ height: '56px' }} />
        <TransparencyDashboard publicStats={publicStats} />
        <BlurFade delay={0.4} duration={0.5} triggerOnViewport>
          <FaqSection />
        </BlurFade>
      </Content>
      <HomeFooter />
    </Layout>
    </>
  )
}
