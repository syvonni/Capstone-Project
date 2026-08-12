import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import InspectionItemCard from '../InspectionItemCard'

describe('InspectionItemCard', () => {
  const mockItem = {
    _id: '1',
    name: 'Fire Extinguisher Inspection',
    description: 'Check for fire extinguisher',
    isActive: true,
    version: 1,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-05T00:00:00Z',
  }

  const mockOnClick = vi.fn()

  it('renders inspection item name correctly', () => {
    renderWithProviders(
      <InspectionItemCard item={mockItem} onClick={mockOnClick} />
    )

    expect(screen.getByText('Fire Extinguisher Inspection')).toBeInTheDocument()
  })

  it('renders description correctly', () => {
    renderWithProviders(
      <InspectionItemCard item={mockItem} onClick={mockOnClick} />
    )

    expect(screen.getByText('Check for fire extinguisher')).toBeInTheDocument()
  })

  it('displays active status with green tag', () => {
    renderWithProviders(
      <InspectionItemCard item={mockItem} onClick={mockOnClick} />
    )

    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('displays inactive status with red tag', () => {
    const inactiveItem = { ...mockItem, isActive: false }
    renderWithProviders(
      <InspectionItemCard item={inactiveItem} onClick={mockOnClick} />
    )

    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('shows version in meta info', () => {
    renderWithProviders(
      <InspectionItemCard item={mockItem} onClick={mockOnClick} />
    )

    expect(screen.getByText(/Version/i)).toBeInTheDocument()
    expect(screen.getByText(/Version: 1/i)).toBeInTheDocument()
  })

  it('displays created date in meta info', () => {
    renderWithProviders(
      <InspectionItemCard item={mockItem} onClick={mockOnClick} />
    )

    expect(screen.getByText(/Created on/i)).toBeInTheDocument()
  })

  it('displays updated date in meta info', () => {
    renderWithProviders(
      <InspectionItemCard item={mockItem} onClick={mockOnClick} />
    )

    expect(screen.getByText(/Last updated on/i)).toBeInTheDocument()
  })

  it('handles selected state correctly', () => {
    renderWithProviders(
      <InspectionItemCard item={mockItem} selected={true} onClick={mockOnClick} />
    )

    // Just verify it renders without error when selected
    expect(screen.getByText('Fire Extinguisher Inspection')).toBeInTheDocument()
  })

  it('calls onClick callback when clicked', () => {
    renderWithProviders(
      <InspectionItemCard item={mockItem} onClick={mockOnClick} />
    )

    const card = screen.getByText('Fire Extinguisher Inspection')
    card.click()
    expect(mockOnClick).toHaveBeenCalled()
  })

  it('handles missing optional fields gracefully', () => {
    const minimalItem = {
      _id: '1',
      name: 'Minimal Item',
      isActive: true,
    }

    renderWithProviders(
      <InspectionItemCard item={minimalItem} onClick={mockOnClick} />
    )

    expect(screen.getByText('Minimal Item')).toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    renderWithProviders(
      <InspectionItemCard item={mockItem} onClick={mockOnClick} />
    )

    // Should contain formatted date (August 1, 2026)
    expect(screen.getAllByText(/August/i)).toHaveLength(2)
  })
})
