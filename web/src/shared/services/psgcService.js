/**
 * Philippine Standard Geographic Code (PSGC) Service
 *
 * Fetches Philippine location data from the PSGC API
 * API Documentation: https://psgc.gitlab.io/api/
 */

const PSGC_API_BASE = 'https://psgc.gitlab.io/api'

// Cache for API responses to avoid repeated calls
const cache = {
  regions: null,
  provinces: null,
  citiesMunicipalities: {},
  barangays: {},
}

/**
 * Normalize text for comparison
 */
const normalizeText = (text) => {
  if (!text) return ''
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')        // Normalize spaces
    .trim()
}

/**
 * Calculate similarity between two strings (Jaccard similarity on character pairs)
 */
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0
  if (str1 === str2) return 1

  // Create character bigrams
  const getBigrams = (str) => {
    const bigrams = new Set()
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2))
    }
    return bigrams
  }

  const bigrams1 = getBigrams(str1)
  const bigrams2 = getBigrams(str2)

  // Calculate intersection
  let intersection = 0
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) {
      intersection++
    }
  }

  // Jaccard similarity
  const union = bigrams1.size + bigrams2.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * Fetch all regions
 */
export const fetchRegions = async () => {
  if (cache.regions) {
    return cache.regions
  }

  try {
    const response = await fetch(`${PSGC_API_BASE}/regions.json`)
    const data = await response.json()
    cache.regions = data.sort((a, b) => a.name.localeCompare(b.name))
    return cache.regions
  } catch (error) {
    console.error('Failed to fetch regions:', error)
    return []
  }
}

/**
 * Fetch all provinces
 */
export const fetchProvinces = async () => {
  if (cache.provinces) {
    return cache.provinces
  }

  try {
    const response = await fetch(`${PSGC_API_BASE}/provinces.json`)
    const data = await response.json()
    cache.provinces = data.sort((a, b) => a.name.localeCompare(b.name))
    return cache.provinces
  } catch (error) {
    console.error('Failed to fetch provinces:', error)
    return []
  }
}

/**
 * Fetch cities/municipalities for a province
 * @param {string} provinceCode - The PSGC code of the province
 */
export const fetchCitiesMunicipalities = async (provinceCode) => {
  if (!provinceCode) return []
  
  if (cache.citiesMunicipalities[provinceCode]) {
    return cache.citiesMunicipalities[provinceCode]
  }

  try {
    const response = await fetch(`${PSGC_API_BASE}/provinces/${provinceCode}/cities-municipalities.json`)
    const data = await response.json()
    cache.citiesMunicipalities[provinceCode] = data.sort((a, b) => a.name.localeCompare(b.name))
    return cache.citiesMunicipalities[provinceCode]
  } catch (error) {
    console.error('Failed to fetch cities/municipalities:', error)
    return []
  }
}

/**
 * Fetch barangays for a city/municipality
 * @param {string} cityMunicipalityCode - The PSGC code of the city/municipality
 */
export const fetchBarangays = async (cityMunicipalityCode) => {
  if (!cityMunicipalityCode) return []
  
  if (cache.barangays[cityMunicipalityCode]) {
    return cache.barangays[cityMunicipalityCode]
  }

  try {
    const response = await fetch(`${PSGC_API_BASE}/cities-municipalities/${cityMunicipalityCode}/barangays.json`)
    const data = await response.json()
    cache.barangays[cityMunicipalityCode] = data.sort((a, b) => a.name.localeCompare(b.name))
    return cache.barangays[cityMunicipalityCode]
  } catch (error) {
    console.error('Failed to fetch barangays:', error)
    return []
  }
}

/**
 * Fix common OCR errors in location text
 * @param {string} text - OCR text to clean
 * @returns {string} Cleaned text
 */
const fixOcrErrors = (text) => {
  if (!text) return ''
  return text
    .replace(/GITY/gi, 'CITY')   // G -> C (common OCR error)
    .replace(/ClTY/gi, 'CITY')   // l -> I
    .replace(/C1TY/gi, 'CITY')   // 1 -> I
    .replace(/POBLAC10N/gi, 'POBLACION')
    .replace(/P0BLACION/gi, 'POBLACION')  // 0 -> O
    .replace(/0/g, 'O')          // Common: 0 -> O in names
}

/**
 * Fuzzy match a string to find the best matching location
 * @param {string} searchText - Text to search for
 * @param {Array} locations - Array of location objects with 'name' property
 * @param {number} threshold - Minimum similarity threshold (default 0.65)
 * @returns {Object|null} Best matching location or null
 */
export const fuzzyMatchLocation = (searchText, locations, threshold = 0.65) => {
  if (!searchText || !locations || locations.length === 0) {
    return null
  }

  // Fix OCR errors first
  const cleanedSearch = fixOcrErrors(searchText)
  const normalizedSearch = normalizeText(cleanedSearch)
  
  // Skip if the search text is too short or looks like noise
  if (normalizedSearch.length < 3) {
    return null
  }
  
  // First try exact match
  const exactMatch = locations.find(
    loc => normalizeText(loc.name) === normalizedSearch
  )
  if (exactMatch) return exactMatch

  // Try exact match with OCR-corrected location names too
  const exactMatchOcr = locations.find(
    loc => normalizeText(fixOcrErrors(loc.name)) === normalizedSearch
  )
  if (exactMatchOcr) return exactMatchOcr

  // Then try starts-with match (only if search is reasonably long)
  if (normalizedSearch.length >= 4) {
    const startsWithMatch = locations.find(
      loc => normalizeText(loc.name).startsWith(normalizedSearch) ||
             normalizedSearch.startsWith(normalizeText(loc.name))
    )
    if (startsWithMatch) return startsWithMatch
  }

  // Then try contains match (but be strict - search term should be significant)
  if (normalizedSearch.length >= 5) {
    const containsMatch = locations.find(
      loc => normalizeText(loc.name).includes(normalizedSearch) ||
             normalizedSearch.includes(normalizeText(loc.name))
    )
    if (containsMatch) return containsMatch
  }

  // Finally try similarity scoring with higher threshold
  let bestMatch = null
  let bestScore = 0

  for (const location of locations) {
    const locName = normalizeText(location.name)
    const score = calculateSimilarity(normalizedSearch, locName)
    if (score > bestScore && score >= threshold) {
      bestScore = score
      bestMatch = location
    }
  }

  // Log for debugging
  if (bestMatch) {
    console.log(`Fuzzy matched "${searchText}" to "${bestMatch.name}" (score: ${bestScore.toFixed(2)})`)
  } else {
    console.log(`No match found for "${searchText}" (best score was ${bestScore.toFixed(2)}, threshold: ${threshold})`)
  }

  return bestMatch
}

/**
 * Find province by name (fuzzy match)
 */
export const findProvinceByName = async (provinceName) => {
  const provinces = await fetchProvinces()
  return fuzzyMatchLocation(provinceName, provinces)
}

/**
 * Find city/municipality by name within a province (fuzzy match)
 * Handles partial matches like "Carlos City" → "San Carlos City"
 */
export const findCityByName = async (cityName, provinceCode) => {
  const cities = await fetchCitiesMunicipalities(provinceCode)
  
  // First try regular fuzzy match
  const match = fuzzyMatchLocation(cityName, cities)
  if (match) return match
  
  const normalizedSearch = normalizeText(fixOcrErrors(cityName))
  const altNames = new Set()
  if (normalizedSearch.endsWith(' CITY')) {
    const base = normalizedSearch.replace(/ CITY$/, '').trim()
    if (base) altNames.add(`CITY OF ${base}`)
  }
  if (normalizedSearch.startsWith('CITY OF ')) {
    const base = normalizedSearch.replace(/^CITY OF /, '').trim()
    if (base) altNames.add(`${base} CITY`)
  }
  for (const altName of altNames) {
    const altMatch = fuzzyMatchLocation(altName, cities)
    if (altMatch) {
      console.log(`Alt city match: "${cityName}" → "${altMatch.name}"`)
      return altMatch
    }
  }

  // If no match, try to find cities that END with the search term
  // This handles "Carlos City" matching "San Carlos City"
  if (normalizedSearch.length >= 5) {
    const endMatch = cities.find(city => {
      const normalizedCity = normalizeText(city.name)
      return normalizedCity.endsWith(normalizedSearch) ||
             normalizedCity.includes(normalizedSearch)
    })
    if (endMatch) {
      console.log(`Partial city match: "${cityName}" → "${endMatch.name}"`)
      return endMatch
    }
  }
  
  return null
}

/**
 * Find barangay by name within a city/municipality (fuzzy match)
 */
export const findBarangayByName = async (barangayName, cityMunicipalityCode) => {
  const barangays = await fetchBarangays(cityMunicipalityCode)
  return fuzzyMatchLocation(barangayName, barangays)
}

/**
 * Find province by code
 */
export const findProvinceByCode = async (code) => {
  const provinces = await fetchProvinces()
  return provinces.find(p => p.code === code) || null
}

/**
 * Find city/municipality by code
 */
export const findCityByCode = async (code) => {
  // Cities are cached by province, so we need to search all provinces
  const provinces = await fetchProvinces()
  for (const province of provinces) {
    const cities = await fetchCitiesMunicipalities(province.code)
    const city = cities.find(c => c.code === code)
    if (city) return city
  }
  return null
}

/**
 * Find barangay by code
 */
export const findBarangayByCode = async (code) => {
  // Barangays are cached by city, so we need to search all cities
  const provinces = await fetchProvinces()
  for (const province of provinces) {
    const cities = await fetchCitiesMunicipalities(province.code)
    for (const city of cities) {
      const barangays = await fetchBarangays(city.code)
      const barangay = barangays.find(b => b.code === code)
      if (barangay) return barangay
    }
  }
  return null
}

/**
 * Clear the cache (useful for testing or refreshing data)
 */
export const clearCache = () => {
  cache.regions = null
  cache.provinces = null
  cache.citiesMunicipalities = {}
  cache.barangays = {}
}

export default {
  fetchRegions,
  fetchProvinces,
  fetchCitiesMunicipalities,
  fetchBarangays,
  fuzzyMatchLocation,
  findProvinceByName,
  findCityByName,
  findBarangayByName,
  findProvinceByCode,
  findCityByCode,
  findBarangayByCode,
  clearCache,
}
