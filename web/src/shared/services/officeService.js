import { fetchJsonWithFallback } from '@/lib/http.js'

const FALLBACK_OFFICES = [
  { code: 'OSBC', name: 'One Stop Business Center', group: 'Core Offices', isActive: true },
  { code: 'CHO', name: 'City Health Office', group: 'Core Offices', isActive: true },
  { code: 'BFP', name: 'Bureau of Fire Protection', group: 'Core Offices', isActive: true },
  { code: 'CEO / ZC', name: 'City Engineering Office / Zoning Clearance', group: 'Core Offices', isActive: true },
  { code: 'BH', name: 'Barangay Hall / Barangay Business Clearance', group: 'Core Offices', isActive: true },
  { code: 'DTI', name: 'Department of Trade and Industry', group: 'Preneed / Inter-Govt Clearances', isActive: true },
  { code: 'SEC', name: 'Securities and Exchange Commission', group: 'Preneed / Inter-Govt Clearances', isActive: true },
  { code: 'CDA', name: 'Cooperative Development Authority', group: 'Preneed / Inter-Govt Clearances', isActive: true },
  { code: 'PNP-FEU', name: 'Firearms & Explosives Unit', group: 'Specialized / Conditional Offices', isActive: true },
  { code: 'FDA / BFAD / DOH', name: 'Food & Drug Administration / Bureau of Food & Drugs / Department of Health', group: 'Specialized / Conditional Offices', isActive: true },
  { code: 'PRC / PTR', name: 'Professional Regulatory Commission / Professional Tax Registration Boards', group: 'Specialized / Conditional Offices', isActive: true },
  { code: 'NTC', name: 'National Telecommunications Commission', group: 'Specialized / Conditional Offices', isActive: true },
  { code: 'POEA', name: 'Philippine Overseas Employment Administration', group: 'Specialized / Conditional Offices', isActive: true },
  { code: 'NIC', name: 'National Insurance Commission', group: 'Specialized / Conditional Offices', isActive: true },
  { code: 'ECC / ENV', name: 'Environmental Compliance Certificate / Environmental Office', group: 'Specialized / Conditional Offices', isActive: true },
  { code: 'CTO', name: 'City Treasurer’s Office', group: 'Support / Coordination Offices', isActive: true },
  { code: 'MD', name: 'Market Division / Sector-Specific Divisions', group: 'Support / Coordination Offices', isActive: true },
  { code: 'CLO', name: 'City Legal Office', group: 'Support / Coordination Offices', isActive: true },
]

async function fetchOffices(path) {
  const data = await fetchJsonWithFallback(path, { method: 'GET' })
  const payload = data
  return Array.isArray(payload) ? payload : (payload?.offices || [])
}

export async function getOffices() {
  try {
    const list = await fetchOffices('/api/auth/offices')
    if (list.length) return list
  } catch { /* ignore */ }

  try {
    const list = await fetchOffices('/api/auth/admin/offices')
    if (list.length) return list
  } catch { /* ignore */ }

  return FALLBACK_OFFICES
}

export function resolveOfficeLabel(officeCode, offices = []) {
  const code = String(officeCode || '').trim()
  if (!code) return ''
  const match = (offices || []).find((office) => String(office?.code || '') === code)
  return match?.name || code
}
