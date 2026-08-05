import { useState, useEffect } from 'react'
import { getMaintenanceConflicts } from '@/features/admin/services/maintenanceService'
import { get } from '@/lib/http.js'
import dayjs from 'dayjs'
import {
  MIN_MAINTENANCE_DURATION_HOURS,
  MAX_MAINTENANCE_DURATION_DAYS,
  MAX_SCHEDULING_HORIZON_DAYS,
} from '../constants/maintenance.constants.js'

export function useMaintenanceConflictDetection(open, maintenanceActive, forceScheduleMode) {
  const [conflicts, setConflicts] = useState([])
  const [currentMaintenance, setCurrentMaintenance] = useState({ active: false, scheduled: false })

  const hasConflict = (startValue, endValue) => {
    if (!startValue || !endValue) return false
    const start = dayjs(startValue)
    const end = dayjs(endValue)
    if (!start.isValid() || !end.isValid() || !end.isAfter(start)) return false
    return conflicts.some((conflict) => {
      // Skip current active maintenance from conflict check
      if (maintenanceActive && currentMaintenance?.expectedResumeAt) {
        const currentResumeAt = dayjs(currentMaintenance.expectedResumeAt)
        const conflictEnd = dayjs(conflict.endAt || conflict.expectedResumeAt)
        if (conflictEnd.isValid() && conflictEnd.isSame(currentResumeAt)) return false
      }
      const cStart = dayjs(conflict.startAt || conflict.scheduledStartAt)
      const cEnd = dayjs(conflict.endAt || conflict.expectedResumeAt)
      if (!cStart.isValid() || !cEnd.isValid()) return false
      return start.isBefore(cEnd) && cStart.isBefore(end)
    })
  }

  // Load conflicts when modal opens
  useEffect(() => {
    let alive = true
    async function loadConflicts() {
      if (!open || (maintenanceActive && !forceScheduleMode)) {
        if (alive) setConflicts([])
        return
      }
      try {
        const from = dayjs().startOf('day')
        const to = dayjs().add(90, 'day').endOf('day')
        const result = await getMaintenanceConflicts(from.toISOString(), to.toISOString())
        if (!alive) return
        setConflicts(Array.isArray(result?.conflicts) ? result.conflicts : [])
      } catch {
        if (alive) setConflicts([])
      }
    }
    loadConflicts()
    return () => {
      alive = false
    }
  }, [open, maintenanceActive, forceScheduleMode])

  // Fetch current maintenance status
  useEffect(() => {
    let alive = true
    async function fetchMaintenanceStatus() {
      if (!open) return
      try {
        const maintenance = await get('/api/maintenance/status', { skipAuth: true }).catch(() => ({ active: false, scheduled: false }))
        if (!alive) return
        setCurrentMaintenance({
          active: !!maintenance?.active,
          scheduled: !!maintenance?.scheduled,
          expectedResumeAt: maintenance?.expectedResumeAt || null,
        })
      } catch {
        if (alive) setCurrentMaintenance({ active: false, scheduled: false })
      }
    }
    fetchMaintenanceStatus()
    return () => {
      alive = false
    }
  }, [open])

  // Validation rules for form fields
  const validateScheduledStartAt = (_, value) => {
    if (!value) return Promise.resolve()
    if (value.isBefore(dayjs(), 'minute')) {
      return Promise.reject(new Error('Start time must be in the future'))
    }
    const maxDate = dayjs().add(MAX_SCHEDULING_HORIZON_DAYS, 'day')
    if (value.isAfter(maxDate)) {
      return Promise.reject(new Error(`Maintenance cannot be scheduled more than ${MAX_SCHEDULING_HORIZON_DAYS} days in advance`))
    }
    if (maintenanceActive && currentMaintenance?.expectedResumeAt) {
      const currentResumeAt = dayjs(currentMaintenance.expectedResumeAt)
      if (value.isBefore(currentResumeAt)) {
        return Promise.reject(new Error('Start time must be after the current maintenance session ends'))
      }
    }
    return Promise.resolve()
  }

  const validateExpectedResumeAt = (scheduledStartAt) => (_, value) => {
    if (!value) return Promise.resolve()
    if (value.isBefore(dayjs(), 'minute')) {
      return Promise.reject(new Error('Resume time must be in the future'))
    }
    const startValue = scheduledStartAt || dayjs()
    if (hasConflict(startValue, value)) {
      return Promise.reject(new Error('Selected schedule overlaps with an existing pending or approved maintenance request. Please choose another time slot.'))
    }
    if (maintenanceActive && currentMaintenance?.expectedResumeAt) {
      const currentResumeAt = dayjs(currentMaintenance.expectedResumeAt)
      if (value.isBefore(currentResumeAt)) {
        return Promise.reject(new Error('Resume time must be after the current maintenance session ends'))
      }
    }
    if (startValue) {
      const durationHours = value.diff(startValue, 'hour', true)
      if (durationHours < MIN_MAINTENANCE_DURATION_HOURS) {
        return Promise.reject(new Error(`Maintenance duration must be at least ${MIN_MAINTENANCE_DURATION_HOURS} hour(s)`))
      }
      const durationDays = value.diff(startValue, 'day', true)
      if (durationDays > MAX_MAINTENANCE_DURATION_DAYS) {
        return Promise.reject(new Error(`Maintenance duration cannot exceed ${MAX_MAINTENANCE_DURATION_DAYS} day(s)`))
      }
    }
    return Promise.resolve()
  }

  const validateDuration = (startValue) => (_, value) => {
    if (!value) return Promise.resolve()
    if (!startValue) return Promise.resolve()
    const durationHours = value.diff(startValue, 'hour', true)
    if (durationHours < MIN_MAINTENANCE_DURATION_HOURS) {
      return Promise.reject(new Error(`Maintenance duration must be at least ${MIN_MAINTENANCE_DURATION_HOURS} hour(s)`))
    }
    const durationDays = value.diff(startValue, 'day', true)
    if (durationDays > MAX_MAINTENANCE_DURATION_DAYS) {
      return Promise.reject(new Error(`Maintenance duration cannot exceed ${MAX_MAINTENANCE_DURATION_DAYS} day(s)`))
    }
    return Promise.resolve()
  }

  return {
    conflicts,
    currentMaintenance,
    hasConflict,
    validateScheduledStartAt,
    validateExpectedResumeAt,
    validateDuration,
  }
}
