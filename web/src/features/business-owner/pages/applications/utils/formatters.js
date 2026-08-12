import dayjs from 'dayjs'

export function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return dayjs(dateStr).format('MMM D, YYYY')
}

export function formatDateLong(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatCurrency(value) {
  if (!value && value !== 0) return '₱0.00'
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
}
