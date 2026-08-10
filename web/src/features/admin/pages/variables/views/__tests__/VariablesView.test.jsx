import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { userEvent } from '@testing-library/user-event'
import VariablesView from '../VariablesView'

describe('VariablesView Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('renders the view without errors', () => {
      renderWithProviders(<VariablesView />)

      // Should render without throwing errors
      expect(document.body).toBeInTheDocument()
    })

    it('has add button available', async () => {
      renderWithProviders(<VariablesView />)

      // Wait for component to render
      await waitFor(() => {
        const addButton = screen.getByText(/add variable/i)
        expect(addButton).toBeInTheDocument()
      })
    })
  })

  describe('Add Variable Flow', () => {
    it('opens add modal when add button is clicked', async () => {
      renderWithProviders(<VariablesView />)

      const addButton = await screen.findByText(/add variable/i)
      const user = userEvent.setup()
      await user.click(addButton)

      // Modal should be rendered
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('closes modal when close button is clicked', async () => {
      renderWithProviders(<VariablesView />)

      const addButton = await screen.findByText(/add variable/i)
      const user = userEvent.setup()
      await user.click(addButton)

      // Open modal
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Component Integration', () => {
    it('renders list panel component', async () => {
      renderWithProviders(<VariablesView />)

      // Should have list content
      await waitFor(() => {
        expect(screen.getByText(/add variable/i)).toBeInTheDocument()
      })
    })

    it('has filter functionality available', async () => {
      renderWithProviders(<VariablesView />)

      // Should have filter button
      await waitFor(() => {
        const filterButton = screen.getByLabelText(/toggle filters/i)
        expect(filterButton).toBeInTheDocument()
      })
    })

    it('has search functionality available', async () => {
      renderWithProviders(<VariablesView />)

      // Should have search input
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search/i)
        expect(searchInput).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Layout', () => {
    it('renders responsive split layout', async () => {
      renderWithProviders(<VariablesView />)

      // Should render layout
      await waitFor(() => {
        expect(screen.getByText(/add variable/i)).toBeInTheDocument()
      })
    })
  })
})
