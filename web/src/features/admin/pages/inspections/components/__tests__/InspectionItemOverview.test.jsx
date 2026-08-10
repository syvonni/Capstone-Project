import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import InspectionItemOverview from '../InspectionItemOverview'

// Mock document for skeleton test
global.document = document

describe('InspectionItemOverview', () => {
  const mockInspectionItem = {
    _id: '1',
    name: 'Fire Extinguisher Inspection',
    version: 1,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-05T00:00:00Z',
  }

  const mockInitialValues = {
    name: 'Fire Extinguisher Inspection',
    question: 'Is there a fire extinguisher present on the premises?',
    notes: 'Test notes',
    legalBasis: [
      {
        url: 'https://nfpa.org/codes-and-standards/',
        title: 'NFPA 10 - Portable Fire Extinguishers',
        description: 'Fire extinguisher requirements'
      }
    ],
  }

  const mockViolation = {
    _id: '1',
    name: 'Missing Fire Extinguisher',
  }

  const mockChecklists = [
    {
      _id: 'checklist1',
      name: 'Fire Safety Checklist',
    }
  ]

  it('renders overview correctly', () => {
    renderWithProviders(
      <InspectionItemOverview
        inspectionItem={mockInspectionItem}
        initialValues={mockInitialValues}
        violation={mockViolation}
        associatedChecklists={mockChecklists}
        loading={false}
      />
    )

    expect(screen.getByText('Fire Extinguisher Inspection')).toBeInTheDocument()
  })

  it('displays key statistics', () => {
    renderWithProviders(
      <InspectionItemOverview
        inspectionItem={mockInspectionItem}
        initialValues={mockInitialValues}
        violation={mockViolation}
        associatedChecklists={mockChecklists}
        loading={false}
      />
    )

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Version')).toBeInTheDocument()
  })

  it('displays question field', () => {
    renderWithProviders(
      <InspectionItemOverview
        inspectionItem={mockInspectionItem}
        initialValues={mockInitialValues}
        violation={mockViolation}
        associatedChecklists={mockChecklists}
        loading={false}
      />
    )

    expect(screen.getByText('Question')).toBeInTheDocument()
    expect(screen.getByText('Is there a fire extinguisher present on the premises?')).toBeInTheDocument()
  })

  it('displays legal basis with links', () => {
    renderWithProviders(
      <InspectionItemOverview
        inspectionItem={mockInspectionItem}
        initialValues={mockInitialValues}
        violation={mockViolation}
        associatedChecklists={mockChecklists}
        loading={false}
      />
    )

    expect(screen.getByText('Legal Basis')).toBeInTheDocument()
    expect(screen.getByText('NFPA 10 - Portable Fire Extinguishers')).toBeInTheDocument()
  })

  it('displays associated violation', () => {
    renderWithProviders(
      <InspectionItemOverview
        inspectionItem={mockInspectionItem}
        initialValues={mockInitialValues}
        violation={mockViolation}
        associatedChecklists={mockChecklists}
        loading={false}
      />
    )

    expect(screen.getByText('Associated Violation')).toBeInTheDocument()
    expect(screen.getByText('Missing Fire Extinguisher')).toBeInTheDocument()
  })

  it('displays associated checklists', () => {
    renderWithProviders(
      <InspectionItemOverview
        inspectionItem={mockInspectionItem}
        initialValues={mockInitialValues}
        violation={mockViolation}
        associatedChecklists={mockChecklists}
        loading={false}
      />
    )

    expect(screen.getByText('Associated Checklist')).toBeInTheDocument()
    expect(screen.getByText('Fire Safety Checklist')).toBeInTheDocument()
  })

  it('handles multiple associated checklists', () => {
    const multipleChecklists = [
      { _id: 'checklist1', name: 'Fire Safety Checklist' },
      { _id: 'checklist2', name: 'Building Safety Checklist' },
    ]

    renderWithProviders(
      <InspectionItemOverview
        inspectionItem={mockInspectionItem}
        initialValues={mockInitialValues}
        violation={mockViolation}
        associatedChecklists={multipleChecklists}
        loading={false}
      />
    )

    expect(screen.getByText('Associated Checklists')).toBeInTheDocument()
  })

  it('handles loading state', () => {
    renderWithProviders(
      <InspectionItemOverview
        inspectionItem={mockInspectionItem}
        initialValues={mockInitialValues}
        violation={mockViolation}
        associatedChecklists={mockChecklists}
        loading={true}
      />
    )

    // Should show skeleton loading state (skeleton elements)
    const skeletons = document.querySelectorAll('.ant-skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('handles missing violation', () => {
    renderWithProviders(
      <InspectionItemOverview
        inspectionItem={mockInspectionItem}
        initialValues={mockInitialValues}
        violation={null}
        associatedChecklists={mockChecklists}
        loading={false}
      />
    )

    expect(screen.queryByText('Associated Violation')).not.toBeInTheDocument()
  })

  it('handles empty legal basis', () => {
    const initialValuesWithoutLegalBasis = {
      ...mockInitialValues,
      legalBasis: [],
    }

    renderWithProviders(
      <InspectionItemOverview
        inspectionItem={mockInspectionItem}
        initialValues={initialValuesWithoutLegalBasis}
        violation={mockViolation}
        associatedChecklists={mockChecklists}
        loading={false}
      />
    )

    expect(screen.getByText('Legal Basis')).toBeInTheDocument()
  })
})
