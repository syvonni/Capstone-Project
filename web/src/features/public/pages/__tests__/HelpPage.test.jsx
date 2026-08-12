import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfigProvider, App } from 'antd'
import { BrowserRouter } from 'react-router-dom'
import HelpPage from '../HelpPage.jsx'

// Mock the dependencies
vi.mock('@/shared/components/graphics/MosaicArt.jsx', () => ({
  default: () => <div data-testid="mosaic-art">Mosaic Art</div>,
}))

vi.mock('@/shared/components/animations/PanAnimation.jsx', () => ({
  default: ({ children }) => <div data-testid="pan-animation">{children}</div>,
}))

vi.mock('@/shared/components/animations/BlurFade.jsx', () => ({
  default: ({ children }) => <div data-testid="blur-fade">{children}</div>,
}))

vi.mock('@/shared/components/DynamicFaqSection.jsx', () => ({
  default: () => <div data-testid="dynamic-faq">FAQ Section</div>,
}))

vi.mock('../components/HomeHeader.jsx', () => ({
  default: () => <div data-testid="home-header">Home Header</div>,
}))

vi.mock('../components/HomeFooter.jsx', () => ({
  default: () => <div data-testid="home-footer">Home Footer</div>,
}))

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <ConfigProvider>
        <App>
          {component}
        </App>
      </ConfigProvider>
    </BrowserRouter>
  )
}

describe('HelpPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the help page with all form fields', () => {
    renderWithProviders(<HelpPage />)

    expect(screen.getByText(/need help/i)).toBeInTheDocument()
    expect(screen.getByText(/submit a help request/i)).toBeInTheDocument()
    expect(screen.getByText(/subject/i)).toBeInTheDocument()
    expect(screen.getByText(/message/i)).toBeInTheDocument()
    expect(screen.getByText(/email/i)).toBeInTheDocument()
    expect(screen.getByText(/business permit number/i)).toBeInTheDocument()
  })

  it('renders submit button', () => {
    renderWithProviders(<HelpPage />)

    expect(screen.getByText(/submit request/i)).toBeInTheDocument()
  })

  it('displays form instructions', () => {
    renderWithProviders(<HelpPage />)

    expect(screen.getByText(/submit a help request and our team will get back to you/i)).toBeInTheDocument()
  })
})
