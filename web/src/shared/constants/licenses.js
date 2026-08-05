/**
 * NATIONAL AGENCY LICENSES
 * Constants for accreditations and licenses required for business registration
 */

export const LICENSES = {
  DTI: {
    value: 'DTI',
    label: 'DTI Business Name Registration',
    issuingAgency: 'Department of Trade and Industry',
    description: 'Business name registration for sole proprietorships',
  },
  SEC: {
    value: 'SEC',
    label: 'SEC Registration',
    issuingAgency: 'Securities and Exchange Commission',
    description: 'Registration for corporations and partnerships',
  },
  BIR: {
    value: 'BIR',
    label: 'BIR Tax Registration',
    issuingAgency: 'Bureau of Internal Revenue',
    description: 'Tax identification number and registration',
  },
  SSS: {
    value: 'SSS',
    label: 'SSS Employer Registration',
    issuingAgency: 'Social Security System',
    description: 'Employer registration for social security contributions',
  },
  DOLE: {
    value: 'DOLE',
    label: 'DOLE Establishment Registration',
    issuingAgency: 'Department of Labor and Employment',
    description: 'Establishment registration for labor compliance',
  },
  PRC: {
    value: 'PRC',
    label: 'PRC Professional License',
    issuingAgency: 'Professional Regulation Commission',
    description: 'Professional license for doctors, lawyers, engineers, etc.',
  },
  FDA: {
    value: 'FDA',
    label: 'FDA License',
    issuingAgency: 'Food and Drug Administration',
    description: 'License for food and drug businesses',
  },
  PCAB: {
    value: 'PCAB',
    label: 'PCAB License',
    issuingAgency: 'Philippine Contractors Accreditation Board',
    description: 'License for construction companies',
  },
}

export const LICENSE_OPTIONS = Object.values(LICENSES).map(license => ({
  value: license.value,
  label: license.label,
}))
