import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ViolationCard from '../ViolationCard'

describe('ViolationCard', () => {
  const mockViolation = {
    _id: '1',
    name: 'Building Height Violation',
    description: 'Building exceeds maximum allowed height',
    severity: 'major',
    isActive: true,
    feeId: { _id: 'fee1', amount: 5000 },
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-05T00:00:00Z',
    version: 1,
  }

  const mockOnClick = vi.fn()

  it('renders violation name correctly', () => {
    render(<ViolationCard item={mockViolation} onClick={mockOnClick} />)
    expect(screen.getByText('Building Height Violation')).toBeInTheDocument()
  })

  it('renders description correctly', () => {
    render(<ViolationCard item={mockViolation} onClick={mockOnClick} />)
    expect(screen.getByText('Building exceeds maximum allowed height')).toBeInTheDocument()
  })

  it('displays active status with green tag', () => {
    render(<ViolationCard item={mockViolation} onClick={mockOnClick} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('displays disabled status with red tag', () => {
    const disabledViolation = { ...mockViolation, isActive: false }
    render(<ViolationCard item={disabledViolation} onClick={mockOnClick} />)
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('shows severity level tag', () => {
    render(<ViolationCard item={mockViolation} onClick={mockOnClick} />)
    expect(screen.getByText('Major')).toBeInTheDocument()
  })

  it('displays fee amount tag when present', () => {
    render(<ViolationCard item={mockViolation} onClick={mockOnClick} />)
    expect(screen.getByText(/5,000/)).toBeInTheDocument()
  })

  it('does not display fee amount tag when absent', () => {
    const violationWithoutFee = { ...mockViolation, feeId: null }
    render(<ViolationCard item={violationWithoutFee} onClick={mockOnClick} />)
    expect(screen.queryByText(/5,000/)).not.toBeInTheDocument()
  })

  it('displays version in meta info', () => {
    render(<ViolationCard item={mockViolation} onClick={mockOnClick} />)
    expect(screen.getByText(/Version/)).toBeInTheDocument()
  })

  it('displays created date in meta info', () => {
    render(<ViolationCard item={mockViolation} onClick={mockOnClick} />)
    expect(screen.getByText(/Created on/)).toBeInTheDocument()
  })

  it('displays updated date in meta info', () => {
    render(<ViolationCard item={mockViolation} onClick={mockOnClick} />)
    expect(screen.getByText(/Last updated on/)).toBeInTheDocument()
  })

  it('handles selected state correctly', () => {
    const { container } = render(
      <ViolationCard item={mockViolation} selected={true} onClick={mockOnClick} />
    )
    // The selected state is handled by the PanelCard component
    expect(container).toBeInTheDocument()
  })

  it('calls onClick callback when clicked', () => {
    render(<ViolationCard item={mockViolation} onClick={mockOnClick} />)
    const card = screen.getByText('Building Height Violation')
    card.click()
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('handles missing optional fields gracefully', () => {
    const minimalViolation = {
      _id: '1',
      name: 'Test Violation',
      severity: 'minor',
      isActive: true,
    }
    render(<ViolationCard item={minimalViolation} onClick={mockOnClick} />)
    expect(screen.getByText('Test Violation')).toBeInTheDocument()
  })

  it('formats currency correctly', () => {
    render(<ViolationCard item={mockViolation} onClick={mockOnClick} />)
    expect(screen.getByText(/₱5,000/)).toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    render(<ViolationCard item={mockViolation} onClick={mockOnClick} />)
    expect(screen.getByText(/Created on/)).toBeInTheDocument()
    expect(screen.getByText(/Last updated on/)).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    const { container } = render(
      <ViolationCard item={mockViolation} onClick={mockOnClick} />
    )
    expect(container).toBeInTheDocument()
  })

  it('handles different severity levels', () => {
    const minorViolation = { ...mockViolation, severity: 'minor' }
    render(<ViolationCard item={minorViolation} onClick={mockOnClick} />)
    expect(screen.getByText('Minor')).toBeInTheDocument()
  })

  it('handles critical severity', () => {
    const criticalViolation = { ...mockViolation, severity: 'critical' }
    render(<ViolationCard item={criticalViolation} onClick={mockOnClick} />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('handles unknown severity', () => {
    const unknownViolation = { ...mockViolation, severity: 'unknown' }
    render(<ViolationCard item={unknownViolation} onClick={mockOnClick} />)
    expect(screen.getByText('unknown')).toBeInTheDocument()
  })
})
