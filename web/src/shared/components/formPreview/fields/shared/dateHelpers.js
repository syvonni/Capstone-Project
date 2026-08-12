import dayjs from 'dayjs'

export function isDateLike(value) {
  if (!value) return false
  if (dayjs.isDayjs(value)) return true
  if (typeof value === 'string') return true
  if (value instanceof Date) return true
  return false
}

export function fromDateEvent(value) {
  if (!value) return null
  return dayjs.isDayjs(value) ? value : dayjs(value)
}

export function parseDayjs(value) {
  if (!value) return null
  if (dayjs.isDayjs(value)) return value
  if (typeof value === 'string') {
    const parsed = dayjs(value)
    return parsed.isValid() ? parsed : null
  }
  if (value instanceof Date) return dayjs(value)
  return null
}

export function getDateValueProps(value) {
  if (!value) return null
  if (dayjs.isDayjs(value)) return { value }
  if (typeof value === 'string') {
    const parsed = dayjs(value)
    return parsed.isValid() ? { value: parsed } : null
  }
  if (value instanceof Date) return { value: dayjs(value) }
  return null
}

export function createEndDateAfterStartValidator(startFieldName, form) {
  return function validateEndDate(_, value) {
    if (!value) return Promise.resolve()
    const startDate = form.getFieldValue(startFieldName)
    if (!startDate) return Promise.resolve()
    if (dayjs(value).isBefore(dayjs(startDate), 'day')) {
      return Promise.reject(new Error('End date must be after or equal to start date'))
    }
    return Promise.resolve()
  }
}
