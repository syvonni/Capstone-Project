import { useState, useCallback, useEffect, useRef } from 'react'
import { Form } from 'antd'
import dayjs from 'dayjs'
import { fetchProvinces, findCityByCode, findBarangayByCode } from '@/shared/services/psgcService'

/**
 * Manages form logic for business owner information editing
 * Handles form initialization, validation, and submission
 */
export function useBusinessOwnerForm(businessOwner) {
  const [editForm] = Form.useForm()
  const [emailForm] = Form.useForm()
  const [hasChanges, setHasChanges] = useState(false)
  const [changedFields, setChangedFields] = useState([])
  const [provinceMap, setProvinceMap] = useState({})
  const cityBarangayCache = useRef({})
  const [baselineValues, setBaselineValues] = useState(null)
  // Monotonic id to guard against stale async change-detection results
  const changeDetectionId = useRef(0)

  // Reset hasChanges and changedFields when modal opens
  const resetChangeTracking = useCallback(() => {
    setHasChanges(false)
    setChangedFields([])
  }, [])

  // Load all provinces once when hook initializes
  useEffect(() => {
    const loadProvinces = async () => {
      const provinces = await fetchProvinces()
      const map = {}
      provinces.forEach(p => map[p.code] = p.name)
      setProvinceMap(map)
    }
    loadProvinces()
  }, [])

  // Resolve a PSGC code to its human-readable name, purely from the code
  // (never from the form's *Name fields, which lag one update behind).
  const resolveAddressName = useCallback(async (field, code) => {
    if (!code) return '(empty)'
    if (field === 'province') return provinceMap[code] || code
    // Free-text or already-a-name values pass through unchanged
    if (!/^\d+$/.test(code)) return code
    if (!cityBarangayCache.current[code]) {
      try {
        const rec = field === 'city' ? await findCityByCode(code) : await findBarangayByCode(code)
        cityBarangayCache.current[code] = rec?.name || code
      } catch {
        cityBarangayCache.current[code] = code
      }
    }
    return cityBarangayCache.current[code] || code
  }, [provinceMap])

  // Check for changes when form values change
  const handleValuesChange = useCallback(async (changedValues, allValues) => {
    if (!baselineValues) return

    // Capture this invocation's id; only the latest invocation commits state
    const callId = ++changeDetectionId.current

    const changes = []

    for (const key of Object.keys(baselineValues)) {
      const initialValue = baselineValues[key]
      const currentValue = allValues[key]

      // Handle nested address object
      if (key === 'address') {
        const addressFields = [
          { label: 'Province', field: 'province' },
          { label: 'City', field: 'city' },
          { label: 'Barangay', field: 'barangay' },
          { label: 'Street', field: 'streetAddress' },
          { label: 'Zip Code', field: 'postalCode' },
        ]
        const codeFields = new Set(['province', 'city', 'barangay'])

        for (const { label, field } of addressFields) {
          const initCode = initialValue?.[field] || ''
          const currCode = currentValue?.[field] || ''
          if (initCode !== currCode) {
            let fromValue
            let toValue
            if (codeFields.has(field)) {
              // Derive both names from codes (synchronously fresh in allValues)
              fromValue = await resolveAddressName(field, initCode)
              toValue = await resolveAddressName(field, currCode)
            } else {
              // Street and zip code are free text, no conversion needed
              fromValue = initCode || '(empty)'
              toValue = currCode || '(empty)'
            }
            changes.push({ field: label, from: fromValue, to: toValue })
          }
        }
      }

      // Handle dayjs date comparison
      else if (key === 'dateOfBirth') {
        if (!initialValue && !currentValue) continue
        if (!initialValue || !currentValue || !initialValue.isSame(currentValue)) {
          const labelMap = {
            firstName: 'First Name',
            middleName: 'Middle Name',
            lastName: 'Last Name',
            suffix: 'Suffix',
            phoneNumber: 'Phone Number',
            sex: 'Sex',
            maritalStatus: 'Marital Status',
            dateOfBirth: 'Date of Birth',
            placeOfBirth: 'Place of Birth',
            nationality: 'Nationality',
            highestEducationalAttainment: 'Highest Educational Attainment',
            fatherName: "Father's Name",
            motherName: "Mother's Name",
            distinctiveMark: 'Distinctive Mark',
          }
          changes.push({
            field: labelMap[key] || key,
            from: initialValue ? initialValue.format('MMMM D, YYYY') : '(empty)',
            to: currentValue ? currentValue.format('MMMM D, YYYY') : '(empty)',
          })
        }
      }

      // Handle string comparison
      else if (initialValue !== currentValue) {
        const labelMap = {
          firstName: 'First Name',
          middleName: 'Middle Name',
          lastName: 'Last Name',
          suffix: 'Suffix',
          phoneNumber: 'Phone Number',
          sex: 'Sex',
          maritalStatus: 'Marital Status',
          placeOfBirth: 'Place of Birth',
          nationality: 'Nationality',
          highestEducationalAttainment: 'Highest Educational Attainment',
          fatherName: "Father's Name",
          motherName: "Mother's Name",
          distinctiveMark: 'Distinctive Mark',
        }
        changes.push({
          field: labelMap[key] || key,
          from: initialValue || '(empty)',
          to: currentValue || '(empty)',
        })
      }
    }

    // Bail out if a newer change-detection invocation has started, preventing
    // a slower (earlier) async run from overwriting fresher results.
    if (callId !== changeDetectionId.current) return

    setHasChanges(changes.length > 0)
    setChangedFields(changes)
  }, [baselineValues, resolveAddressName])

  /**
   * Initialize edit form with business owner data
   */
  const initializeEditForm = useCallback(async () => {
    if (!businessOwner) return

    const formValues = {
      firstName: businessOwner.firstName,
      middleName: businessOwner.middleName,
      lastName: businessOwner.lastName,
      suffix: businessOwner.suffix,
      email: businessOwner.email,
      phoneNumber: businessOwner.phoneNumber,
      sex: businessOwner.sex,
      dateOfBirth: businessOwner.dateOfBirth ? dayjs(businessOwner.dateOfBirth) : null,
      maritalStatus: businessOwner.maritalStatus,
      placeOfBirth: businessOwner.placeOfBirth,
      nationality: businessOwner.nationality,
      highestEducationalAttainment: businessOwner.highestEducationalAttainment,
      fatherName: businessOwner.fatherName,
      motherName: businessOwner.motherName,
      distinctiveMark: businessOwner.distinctiveMark,
      // Address fields - also set these for change detection
      address: {
        province: businessOwner.address?.province || '',
        city: businessOwner.address?.city || '',
        barangay: businessOwner.address?.barangay || '',
        streetAddress: businessOwner.address?.street || '',
        postalCode: businessOwner.address?.zipCode || '',
      },
    }

    editForm.setFieldsValue(formValues)
    // Small delay to ensure form values are set, then capture baseline
    await new Promise(resolve => setTimeout(resolve, 50))
    const currentFormValues = editForm.getFieldsValue()
    setBaselineValues(currentFormValues)
  }, [businessOwner, editForm])

  /**
   * Initialize email form with current email
   */
  const initializeEmailForm = useCallback(() => {
    if (!businessOwner) return

    emailForm.setFieldsValue({
      currentEmail: businessOwner.email,
      newEmail: '',
      confirmEmail: '',
    })
  }, [businessOwner, emailForm])

  /**
   * Reset edit form
   */
  const resetEditForm = useCallback(() => {
    editForm.resetFields()
  }, [editForm])

  /**
   * Reset email form
   */
  const resetEmailForm = useCallback(() => {
    emailForm.resetFields()
  }, [emailForm])

  /**
   * Validate edit form
   */
  const validateEditForm = useCallback(async () => {
    try {
      return await editForm.validateFields()
    } catch (err) {
      console.error('Edit form validation failed:', err)
      throw err
    }
  }, [editForm])

  /**
   * Validate email form
   */
  const validateEmailForm = useCallback(async () => {
    try {
      return await emailForm.validateFields()
    } catch (err) {
      console.error('Email form validation failed:', err)
      throw err
    }
  }, [emailForm])

  return {
    editForm,
    emailForm,
    initializeEditForm,
    initializeEmailForm,
    resetEditForm,
    resetEmailForm,
    validateEditForm,
    validateEmailForm,
    hasChanges,
    changedFields,
    resetChangeTracking,
    handleValuesChange,
  }
}
