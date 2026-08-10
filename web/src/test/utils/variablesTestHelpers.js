/**
 * Test helper functions for Variables feature testing
 */

import { waitFor } from '@testing-library/react'
import { screen, userEvent } from '@testing-library/react'

/**
 * Helper to test hook loading states
 */
export async function testHookLoadingState(hook, result) {
  expect(result.current.loading).toBe(true)
  await waitFor(() => {
    expect(result.current.loading).toBe(false)
  })
}

/**
 * Helper to test hook error states
 */
export async function testHookErrorState(hook, result, errorMessage) {
  await waitFor(() => {
    expect(result.current.error).toBeTruthy()
    if (errorMessage) {
      expect(result.current.error.message).toContain(errorMessage)
    }
  })
}

/**
 * Helper to test hook data fetching
 */
export async function testHookDataFetch(hook, result, expectedData) {
  await waitFor(() => {
    expect(result.current.loading).toBe(false)
  })
  expect(result.current.data).toEqual(expectedData)
}

/**
 * Helper to simulate user typing in search input
 */
export async function typeInSearchInput(searchTerm) {
  const searchInput = screen.getByPlaceholderText(/search/i) || 
                       screen.getByRole('textbox', { name: /search/i })
  const user = userEvent.setup()
  await user.type(searchInput, searchTerm)
}

/**
 * Helper to simulate clicking a filter dropdown
 */
export async function selectFilter(filterLabel, optionValue) {
  const filterButton = screen.getByRole('button', { name: filterLabel })
  const user = userEvent.setup()
  await user.click(filterButton)
  
  const option = screen.getByText(optionValue)
  await user.click(option)
}

/**
 * Helper to simulate clicking a variable card
 */
export async function clickVariableCard(variableName) {
  const card = screen.getByText(variableName)
  const user = userEvent.setup()
  await user.click(card)
}

/**
 * Helper to simulate clicking add button
 */
export async function clickAddButton() {
  const addButton = screen.getByRole('button', { name: /add variable/i })
  const user = userEvent.setup()
  await user.click(addButton)
}

/**
 * Helper to simulate clicking save button
 */
export async function clickSaveButton() {
  const saveButton = screen.getByRole('button', { name: /save/i })
  const user = userEvent.setup()
  await user.click(saveButton)
}

/**
 * Helper to simulate clicking cancel button
 */
export async function clickCancelButton() {
  const cancelButton = screen.getByRole('button', { name: /cancel/i })
  const user = userEvent.setup()
  await user.click(cancelButton)
}

/**
 * Helper to fill form fields
 */
export async function fillFormField(fieldName, value) {
  const field = screen.getByLabelText(fieldName) || 
               screen.getByPlaceholderText(fieldName)
  const user = userEvent.setup()
  await user.clear(field)
  await user.type(field, value)
}

/**
 * Helper to wait for loading to complete
 */
export async function waitForLoadingToComplete() {
  await waitFor(() => {
    const loadingElements = screen.queryAllByRole('progressbar', { hidden: true })
    expect(loadingElements.length).toBe(0)
  })
}

/**
 * Helper to check if element is visible
 */
export function expectElementVisible(text) {
  const element = screen.getByText(text)
  expect(element).toBeVisible()
}

/**
 * Helper to check if element is not visible
 */
export function expectElementNotVisible(text) {
  const element = screen.queryByText(text)
  expect(element).not.toBeInTheDocument()
}

/**
 * Helper to check if element is disabled
 */
export function expectElementDisabled(text) {
  const element = screen.getByRole('button', { name: text })
  expect(element).toBeDisabled()
}

/**
 * Helper to check if success message is shown
 */
export function expectSuccessMessage(message) {
  const successMessage = screen.getByText(message)
  expect(successMessage).toBeVisible()
}

/**
 * Helper to check if error message is shown
 */
export function expectErrorMessage(message) {
  const errorMessage = screen.getByText(message)
  expect(errorMessage).toBeVisible()
}

/**
 * Helper to render component with mock router
 */
export function renderWithRouter(component, route = '/') {
  const { renderWithProviders } = require('@/test/utils/renderWithProviders')
  return renderWithProviders(component, { route })
}

/**
 * Helper to create mock variable data
 */
export function createMockVariable(overrides = {}) {
  return {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Variable',
    description: 'Test description',
    question: 'Test question?',
    calculationMethod: 'per_unit',
    unit: 'per unit',
    unitSingular: 'unit',
    unitPlural: 'units',
    unitContextSingular: 'per unit',
    unitContextPlural: 'per units',
    baseRate: 100,
    isActive: true,
    version: 1,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    customId: 'VAR-TST-001',
    categories: ['ALL'],
    ...overrides
  }
}

/**
 * Helper to mock API response
 */
export function mockApiResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    data,
    status
  }
}

/**
 * Helper to mock API error
 */
export function mockApiError(message, code = 'ERROR', status = 400) {
  return {
    ok: false,
    error: {
      code,
      message
    },
    status
  }
}