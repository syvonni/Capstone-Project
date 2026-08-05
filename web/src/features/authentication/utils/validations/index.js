// Centralized validation exports to simplify imports across the app.
// Avoid duplicate names by aliasing where rules overlap across contexts.

export { namePatternRule } from './namePattern.js'
export {
  firstNameRules,
  lastNameRules,
  middleNameRules,
  suffixRules,
  phoneNumberRules,
  emailRules,
  emailDuplicateRule,
  phoneDuplicateRule,
  termsRules,
  businessOwnerRequiredRules,
  passwordRules as signUpPasswordRules,
  confirmPasswordRules as signUpConfirmPasswordRules,
} from './signUpRules.js'

// Change password rules — alias to unique names
export {
  passwordRules as changePasswordRules,
  confirmPasswordRules as changeConfirmPasswordRules,
  confirmPasswordRulesForNewPassword,
} from './changePasswordRules.js'

// Login rules
export { loginEmailRules, loginPasswordRules } from './loginRules.js'

// Forgot password rules
export { forgotPasswordEmailRules } from './forgotPasswordRules.js'
