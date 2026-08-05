import { getLobsByCategory, mapTaxCodeToCategory, getTaxCodeOptions } from '@/shared/utils/lobApiUtils'

export const TAX_CODE_OPTIONS = getTaxCodeOptions([])

export function getDetailedLinesForTaxCode(lobs, taxCode) {
  const category = mapTaxCodeToCategory(lobs, taxCode)
  const categoryLobs = getLobsByCategory(lobs, category)
  return categoryLobs.map((lob) => ({
    value: lob.name,
    label: lob.name,
    description: lob.description,
    lineOfBusiness: lob.lineOfBusiness,
  }))
}

export function normalizeActivityFromForm(a, lobs) {
  if (!a || !a.taxCode) return null
  const category = mapTaxCodeToCategory(lobs, a.taxCode)
  const detailedLine = a.detailedLine || a.detailedLineOfBusiness
  if (!detailedLine) return null
  return {
    taxCode: a.taxCode,
    lineOfBusiness: a.lineOfBusiness || category || '',
    detailedLine,
    source: a.source === 'ai' ? 'ai' : 'manual',
  }
}

/** Normalize API recommendation to a plain object (avoids circular refs / proxy from response). */
export function normalizeRecommendation(r) {
  if (!r || !r.taxCode || !r.detailedLine) return null
  return {
    taxCode: String(r.taxCode),
    lineOfBusiness: String(r.lineOfBusiness ?? ''),
    detailedLine: String(r.detailedLine),
    psicCode: r.psicCode != null ? String(r.psicCode) : '',
    source: 'ai',
  }
}
