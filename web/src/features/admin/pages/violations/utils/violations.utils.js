/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { SEVERITY_LEVELS } from '../constants/violations.constants'

/**
 * Filter violation items by search query
 */
export function filterItemsBySearch(items, query) {
  if (!query || query.trim() === '') return items
  const q = query.trim().toLowerCase()
  return items.filter((item) => {
    const name = (item.name || '').toLowerCase()
    const description = (item.description || '').toLowerCase()
    return name.includes(q) || description.includes(q)
  })
}

/**
 * Filter violation items by severity
 */
export function filterItemsBySeverity(items, severity) {
  if (!severity) return items
  return items.filter((item) => item.severity === severity)
}

/**
 * Filter violation items by status
 */
export function filterItemsByStatus(items, status) {
  if (status === null) return items
  return items.filter((item) => item.isActive === status)
}

/**
 * Get severity label from value
 */
export function getSeverityLabel(severity) {
  const level = SEVERITY_LEVELS.find(l => l.value === severity)
  return level ? level.label : severity
}

/**
 * Get severity color from value
 */
export function getSeverityColor(severity) {
  const level = SEVERITY_LEVELS.find(l => l.value === severity)
  return level ? level.color : 'default'
}
