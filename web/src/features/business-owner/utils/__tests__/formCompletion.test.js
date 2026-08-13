import dayjs from 'dayjs'
import {
  hasValue,
  getDateRangeValue,
  isDateRangeComplete,
  hasMainFieldValue,
  isFieldComplete,
} from '../formCompletion.js'

describe('hasValue', () => {
  it('recognises strings, booleans and numbers', () => {
    expect(hasValue('abc')).toBe(true)
    expect(hasValue('')).toBe(false)
    expect(hasValue('  ')).toBe(false)
    expect(hasValue(true)).toBe(true)
    expect(hasValue(0)).toBe(true)
    expect(hasValue(false)).toBe(true)
  })

  it('recognises Date and dayjs instances', () => {
    expect(hasValue(new Date('2024-01-01'))).toBe(true)
    expect(hasValue(new Date('invalid'))).toBe(false)
    expect(hasValue(dayjs('2024-01-01'))).toBe(true)
    expect(hasValue(dayjs('invalid'))).toBe(false)
  })

  it('recognises non-empty arrays and objects', () => {
    expect(hasValue([])).toBe(false)
    expect(hasValue([''])).toBe(false)
    expect(hasValue(['abc'])).toBe(true)
    expect(hasValue({})).toBe(false)
    expect(hasValue({ a: '' })).toBe(false)
    expect(hasValue({ a: 'abc' })).toBe(true)
    expect(hasValue([{ cid: 'Qm...' }])).toBe(true)
  })
})

describe('getDateRangeValue', () => {
  it('extracts split _start / _end values', () => {
    const form = {
      durationOfActivity_start: '2024-01-01',
      durationOfActivity_end: '2024-12-31',
    }
    const range = getDateRangeValue(form, 'durationOfActivity')
    expect(range).toEqual({ start: '2024-01-01', end: '2024-12-31' })
  })

  it('extracts legacy object ranges', () => {
    const form = {
      durationOfActivity: { startDate: '2024-01-01', endDate: '2024-12-31' },
    }
    expect(getDateRangeValue(form, 'durationOfActivity')).toEqual({
      start: '2024-01-01',
      end: '2024-12-31',
    })
  })

  it('extracts legacy array ranges', () => {
    const form = { durationOfActivity: ['2024-01-01', '2024-12-31'] }
    expect(getDateRangeValue(form, 'durationOfActivity')).toEqual({
      start: '2024-01-01',
      end: '2024-12-31',
    })
  })

  it('returns null for non-date-range values', () => {
    expect(getDateRangeValue({ businessName: 'ABC' }, 'businessName')).toBe(null)
    expect(getDateRangeValue({}, 'durationOfActivity')).toBe(null)
  })
})

describe('isDateRangeComplete', () => {
  it('returns true when both split date fields are filled', () => {
    const form = {
      durationOfActivity_start: dayjs('2024-01-01'),
      durationOfActivity_end: dayjs('2024-12-31'),
    }
    expect(isDateRangeComplete(form, 'durationOfActivity')).toBe(true)
  })

  it('returns false when one split date field is missing', () => {
    expect(isDateRangeComplete({ durationOfActivity_start: '2024-01-01' }, 'durationOfActivity')).toBe(false)
    expect(isDateRangeComplete({ durationOfActivity_end: '2024-12-31' }, 'durationOfActivity')).toBe(false)
  })

  it('returns false when the range is only whitespace or empty', () => {
    expect(isDateRangeComplete({ durationOfActivity_start: '2024-01-01', durationOfActivity_end: '  ' }, 'durationOfActivity')).toBe(false)
  })

  it('supports object and array date range shapes', () => {
    expect(isDateRangeComplete({ durationOfActivity: { start: '2024-01-01', end: '2024-12-31' } }, 'durationOfActivity')).toBe(true)
    expect(isDateRangeComplete({ durationOfActivity: ['2024-01-01', '2024-12-31'] }, 'durationOfActivity')).toBe(true)
    expect(isDateRangeComplete({ durationOfActivity: { startDate: '2024-01-01' } }, 'durationOfActivity')).toBe(false)
  })
})

describe('hasMainFieldValue', () => {
  it('checks category_upload category and main value', () => {
    const field = { type: 'category_upload' }
    expect(hasMainFieldValue(field, 'doc', { doc_category: 'Passport', doc: 'bafy...' })).toBe(true)
    expect(hasMainFieldValue(field, 'doc', { doc_category: 'Passport' })).toBe(false)
    expect(hasMainFieldValue(field, 'doc', {})).toBe(false)
  })

  it('requires both start and end for a date_range field', () => {
    const field = { type: 'date_range' }
    expect(hasMainFieldValue(field, 'duration', { duration_start: '2024-01-01', duration_end: '2024-12-31' })).toBe(true)
    expect(hasMainFieldValue(field, 'duration', { duration_start: '2024-01-01' })).toBe(false)
  })
})

describe('isFieldComplete', () => {
  it('marks a populated date_range field complete', () => {
    const field = { type: 'date_range', required: false, metadataFields: [] }
    expect(isFieldComplete(field, 'duration', { duration_start: '2024-01-01', duration_end: '2024-12-31' })).toBe(true)
  })

  it('marks an empty required date_range field incomplete', () => {
    const field = { type: 'date_range', required: true, metadataFields: [] }
    expect(isFieldComplete(field, 'duration', { duration_start: '2024-01-01' })).toBe(false)
  })

  it('still works for plain text fields', () => {
    const field = { type: 'text', required: true, metadataFields: [] }
    expect(isFieldComplete(field, 'businessName', { businessName: 'ABC' })).toBe(true)
    expect(isFieldComplete(field, 'businessName', { businessName: '' })).toBe(false)
  })
})
