import dayjs from 'dayjs'

export const formatDate = (date) => {
  if (!date) return 'N/A'
  return dayjs(date).format('YYYY-MM-DD')
}

export const formatDateTime = (date) => {
  if (!date) return 'N/A'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

export const formatCurrency = (amount) => {
  if (amount == null || amount === '') return 'N/A'
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
}

export const formatBoolean = (value) => {
  if (value == null || value === '') return 'N/A'
  return value ? 'Yes' : 'No'
}

export const formatNumber = (value) => {
  if (value == null || value === '') return 'N/A'
  return new Intl.NumberFormat('en-PH').format(value)
}
