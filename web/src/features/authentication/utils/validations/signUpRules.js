import { namePatternRule } from './namePattern.js'

export const firstNameRules = [
  {
    validator: (_, value) => {
      if (value === undefined || value === null || value === '') {
        return Promise.reject(new Error('Please enter your first name'))
      }
      return Promise.resolve()
    }
  },
  namePatternRule,
]

export const lastNameRules = [
  {
    validator: (_, value) => {
      if (value === undefined || value === null || value === '') {
        return Promise.reject(new Error('Please enter your last name'))
      }
      return Promise.resolve()
    }
  },
  namePatternRule,
]

export const middleNameRules = [
  {
    validator: (_, value) => {
      if (value === undefined || value === null || value === '') {
        return Promise.reject(new Error('Please enter your middle name'))
      }
      return Promise.resolve()
    }
  },
  { max: 100, message: 'Middle name must be at most 100 characters' },
  namePatternRule,
]

export const suffixRules = [
  { max: 20, message: 'Suffix must be at most 20 characters (e.g. Jr., Sr., III)' },
  namePatternRule,
]

export const phoneNumberRules = [
  {
    validator: (_, value) => {
      if (value === undefined || value === null || value === '') {
        return Promise.reject(new Error('Please enter your phone number'))
      }
      return Promise.resolve()
    }
  },
  () => ({
    validator(_, value) {
      const v = String(value || '').trim()
      if (!v) return Promise.resolve()
      if (!/^\d{11}$/.test(v)) {
        return Promise.reject(new Error('Phone number must be exactly 11 digits'))
      }
      if (!v.startsWith('09')) {
        return Promise.reject(new Error('Phone number must start with 09'))
      }
      return Promise.resolve()
    }
  })
]

export const phoneDuplicateRule = (checkDuplicateFn) => ({
  validator: async (_, value) => {
    console.log('[VALIDATION] Checking phone duplicate:', value)
    if (!value) return Promise.resolve()
    try {
      const result = await checkDuplicateFn({ phoneNumber: value })
      console.log('[VALIDATION] Phone duplicate check result:', result)
      if (result.exists) {
        return Promise.reject(new Error('Phone number already registered'))
      }
      return Promise.resolve()
    } catch (err) {
      console.error('[VALIDATION] Phone duplicate check failed:', err)
      return Promise.resolve() // Don't block on API errors
    }
  },
})

export const passwordRules = [
  {
    validator: (_, value) => {
      if (value === undefined || value === null || value === '') {
        return Promise.reject(new Error('Please enter your password'))
      }
      return Promise.resolve()
    }
  },
  () => ({
    validator(_, value) {
      if (!value) return Promise.resolve()
      if (value.length < 12) return Promise.reject(new Error('Password must be at least 12 characters long'))
      if (!/[a-z]/.test(value)) return Promise.reject(new Error('Password must contain a lowercase letter'))
      if (!/[A-Z]/.test(value)) return Promise.reject(new Error('Password must contain an uppercase letter'))
      if (!/\d/.test(value)) return Promise.reject(new Error('Password must contain a number'))
      if (!/[^A-Za-z0-9]/.test(value)) return Promise.reject(new Error('Password must contain a special character'))
      return Promise.resolve()
    },
  }),
]

export const confirmPasswordRules = [
    {
      validator: (_, value) => {
        if (value === undefined || value === null || value === '') {
          return Promise.reject(new Error('Please confirm your password'))
        }
        return Promise.resolve()
      }
    },
    ({ getFieldValue }) => ({
        validator(_, value) {
            if (!value || getFieldValue('password') === value) {
                return Promise.resolve()
            }
            return Promise.reject(new Error('Passwords do not match'))
        },
    }),
]

export const emailRules = [
  {
    validator: (_, value) => {
      if (value === undefined || value === null || value === '') {
        return Promise.reject(new Error('Please enter your email'))
      }
      return Promise.resolve()
    }
  },
  { type: 'email', message: 'Please enter a valid email address' },
]

export const emailDuplicateRule = (checkDuplicateFn) => ({
  validator: async (_, value) => {
    console.log('[VALIDATION] Checking email duplicate:', value)
    if (!value) return Promise.resolve()
    try {
      const result = await checkDuplicateFn({ email: value })
      console.log('[VALIDATION] Email duplicate check result:', result)
      if (result.exists) {
        return Promise.reject(new Error('Email already registered'))
      }
      return Promise.resolve()
    } catch (err) {
      console.error('[VALIDATION] Email duplicate check failed:', err)
      return Promise.resolve() // Don't block on API errors
    }
  },
})

export const serviceCategoriesRules = [{
  validator: (_, value) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      return Promise.reject(new Error('Please select at least one service category'))
    }
    return Promise.resolve()
  }
}]

export const businessNameRules = [{
  validator: (_, value) => {
    if (value === undefined || value === null || value === '') {
      return Promise.reject(new Error('Please enter your business name'))
    }
    return Promise.resolve()
  }
}]

export const businessTypeRules = [{
  validator: (_, value) => {
    if (value === undefined || value === null || value === '') {
      return Promise.reject(new Error('Please select your business type'))
    }
    return Promise.resolve()
  }
}]

export const yearsInBusinessRules = [{
  validator: (_, value) => {
    if (value === undefined || value === null || value === '') {
      return Promise.reject(new Error('Please enter years in business'))
    }
    return Promise.resolve()
  }
}]

export const serviceAreasRules = [{
  validator: (_, value) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      return Promise.reject(new Error('Please specify your service areas'))
    }
    return Promise.resolve()
  }
}]

// Builds a rule ensuring entered service areas only include supported cities.
// Pass an array of allowed city names (case-insensitive match).
export function createServiceAreasSupportedRule(allowedCities = []) {
  const allowedLower = Array.isArray(allowedCities)
    ? allowedCities.map((c) => String(c || '').trim().toLowerCase())
    : []
  return {
    validator(_, value) {
      const cities = Array.isArray(value) ? value : []
      const unsupported = cities.filter(
        (c) => !allowedLower.includes(String(c || '').trim().toLowerCase())
      )
      if (unsupported.length > 0) {
        return Promise.reject(new Error(`Unsupported city/cities: ${unsupported.join(', ')}`))
      }
      return Promise.resolve()
    },
  }
}

export const businessPhoneRules = [{
  validator: (_, value) => {
    if (value === undefined || value === null || value === '') {
      return Promise.reject(new Error('Please enter your business phone'))
    }
    return Promise.resolve()
  }
}]

export const businessEmailRules = [
  {
    validator: (_, value) => {
      if (value === undefined || value === null || value === '') {
        return Promise.reject(new Error('Please enter your business email'))
      }
      return Promise.resolve()
    }
  },
  { type: 'email', message: 'This is not a valid email' },
]

export const businessDescriptionRules = [{
  validator: (_, value) => {
    if (value === undefined || value === null || value === '') {
      return Promise.reject(new Error('Please describe your business'))
    }
    return Promise.resolve()
  }
}]

export const businessAddressRules = [{
  validator: (_, value) => {
    if (value === undefined || value === null || value === '') {
      return Promise.reject(new Error('Please enter your street address'))
    }
    return Promise.resolve()
  }
}]

export const cityRules = [{
  validator: (_, value) => {
    if (value === undefined || value === null || value === '') {
      return Promise.reject(new Error('Please enter your city'))
    }
    return Promise.resolve()
  }
}]

export const provinceRules = [{
  validator: (_, value) => {
    if (value === undefined || value === null || value === '') {
      return Promise.reject(new Error('Please enter your province'))
    }
    return Promise.resolve()
  }
}]

export const zipCodeRules = [{
  validator: (_, value) => {
    if (value === undefined || value === null || value === '') {
      return Promise.reject(new Error('Please enter your zip code'))
    }
    return Promise.resolve()
  }
}]

export const termsRules = [
  {
    validator: (_, value) =>
      value ? Promise.resolve() : Promise.reject(new Error('Please accept the terms and conditions')),
  },
]

export const businessOwnerRequiredRules = [
  {
    validator: (_, value) =>
      value ? Promise.resolve() : Promise.reject(new Error('You must check this box to continue')),
  },
]
