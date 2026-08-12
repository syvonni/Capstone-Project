import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import VariableCard from '../VariableCard'

// Mock the PanelCard component
vi.mock('@/shared/components/PanelCard', () => ({
  default: function MockPanelCard({ title, description, metaInfo, tags, selected, onClick }) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(e) }}
        data-selected={selected}
        data-testid="panel-card"
      >
        <div data-testid="card-title">{title}</div>
        {description && <div data-testid="card-description">{description}</div>}
        {metaInfo && metaInfo.map((meta, idx) => (
          <div key={idx} data-testid={`meta-${idx}`}>
            {meta.label}: {meta.value}
          </div>
        ))}
        {tags && tags.map((tag, idx) => (
          <div key={idx} data-testid={`tag-${idx}`} data-color={tag.color}>
            {tag.label}
          </div>
        ))}
      </div>
    )
  }
}))

describe('VariableCard', () => {
  const mockVariable = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Building Height Fee',
    description: 'Fee based on building height',
    question: 'What is the building height?',
    calculationMethod: 'bracketed',
    unit: 'meter',
    unitSingular: 'meter',
    unitPlural: 'meters',
    unitContextSingular: 'per meter',
    unitContextPlural: 'per meters',
    isActive: true,
    version: 1,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    customId: 'VAR-BLD-001'
  }

  const mockOnClick = vi.fn()

  it('renders variable name correctly', () => {
    renderWithProviders(
      <VariableCard item={mockVariable} selected={false} onClick={mockOnClick} />
    )

    expect(screen.getByTestId('card-title')).toHaveTextContent('Building Height Fee')
  })

  it('renders description/question correctly', () => {
    renderWithProviders(
      <VariableCard item={mockVariable} selected={false} onClick={mockOnClick} />
    )

    expect(screen.getByTestId('card-description')).toHaveTextContent('Fee based on building height')
  })

  it('displays active status with green tag', () => {
    renderWithProviders(
      <VariableCard item={mockVariable} selected={false} onClick={mockOnClick} />
    )

    expect(screen.getByTestId('tag-0')).toHaveTextContent('Active')
    expect(screen.getByTestId('tag-0')).toHaveAttribute('data-color', 'green')
  })

  it('displays disabled status with red tag', () => {
    const disabledVariable = { ...mockVariable, isActive: false }
    
    renderWithProviders(
      <VariableCard item={disabledVariable} selected={false} onClick={mockOnClick} />
    )

    expect(screen.getByTestId('tag-0')).toHaveTextContent('Disabled')
    expect(screen.getByTestId('tag-0')).toHaveAttribute('data-color', 'red')
  })

  it('shows calculation method tag', () => {
    renderWithProviders(
      <VariableCard item={mockVariable} selected={false} onClick={mockOnClick} />
    )

    expect(screen.getByTestId('tag-1')).toHaveTextContent('Bracketed')
  })

  it('displays version in meta info', () => {
    renderWithProviders(
      <VariableCard item={mockVariable} selected={false} onClick={mockOnClick} />
    )

    expect(screen.getByTestId('meta-0')).toHaveTextContent(/Version/i)
    expect(screen.getByTestId('meta-0')).toHaveTextContent('1')
  })

  it('displays created date in meta info', () => {
    renderWithProviders(
      <VariableCard item={mockVariable} selected={false} onClick={mockOnClick} />
    )

    expect(screen.getByTestId('meta-1')).toHaveTextContent(/Created on/i)
  })

  it('displays updated date in meta info', () => {
    renderWithProviders(
      <VariableCard item={mockVariable} selected={false} onClick={mockOnClick} />
    )

    expect(screen.getByTestId('meta-2')).toHaveTextContent(/Last updated on/i)
  })

  it('handles selected state correctly', () => {
    renderWithProviders(
      <VariableCard item={mockVariable} selected={true} onClick={mockOnClick} />
    )

    const card = screen.getByTestId('panel-card')
    expect(card).toHaveAttribute('data-selected', 'true')
  })

  it('calls onClick callback when clicked', () => {
    renderWithProviders(
      <VariableCard item={mockVariable} selected={false} onClick={mockOnClick} />
    )

    const card = screen.getByTestId('panel-card')
    card.click()

    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('handles missing optional fields gracefully', () => {
    const minimalVariable = {
      _id: '507f1f77bcf86cd799439011',
      name: 'Minimal Variable',
      isActive: true,
      calculationMethod: 'per_unit'
    }
    
    renderWithProviders(
      <VariableCard item={minimalVariable} selected={false} onClick={mockOnClick} />
    )

    expect(screen.getByTestId('card-title')).toHaveTextContent('Minimal Variable')
  })

  it('handles missing description and uses question', () => {
    const variableWithoutDescription = {
      ...mockVariable,
      description: null
    }
    
    renderWithProviders(
      <VariableCard item={variableWithoutDescription} selected={false} onClick={mockOnClick} />
    )

    expect(screen.getByTestId('card-description')).toHaveTextContent('What is the building height?')
  })

  it('handles missing version gracefully', () => {
    const variableWithoutVersion = {
      ...mockVariable,
      version: undefined
    }
    
    renderWithProviders(
      <VariableCard item={variableWithoutVersion} selected={false} onClick={mockOnClick} />
    )

    expect(screen.getByTestId('card-title')).toHaveTextContent('Building Height Fee')
    // Version should not be in meta info, but other meta info should still be present
    const metaElements = screen.getAllByTestId(/^meta-\d+$/)
    const versionMeta = metaElements.find(el => el.textContent.includes('Version'))
    expect(versionMeta).toBeUndefined()
  })
})