/**
 * Validate templateTexts before save
 * Checks for missing bindings, missing source keys, and unused attributes
 */
export function validateTemplateTexts(templateTexts, templateHtml) {
  const errors = []
  const warnings = []

  if (!templateTexts || !Array.isArray(templateTexts)) {
    return { valid: false, errors: ['templateTexts is not an array'], warnings: [] }
  }

  // Check each text attribute for completeness
  for (let i = 0; i < templateTexts.length; i++) {
    const attr = templateTexts[i]
    const attrName = attr.attributeName || `Attribute ${i + 1}`

    if (!attr.attributeName) {
      errors.push(`${attrName}: Missing attributeName`)
      continue
    }

    if (!attr.sourceType) {
      errors.push(`${attrName}: Missing sourceType`)
      continue
    }

    switch (attr.sourceType) {
      case 'form_field':
        if (!attr.bindings || !Array.isArray(attr.bindings) || attr.bindings.length === 0) {
          errors.push(`${attrName}: Missing bindings for form_field source type`)
        } else {
          const binding = attr.bindings[0]
          if (!binding.fieldKey) {
            errors.push(`${attrName}: Missing fieldKey in binding`)
          }
        }
        break
      case 'system':
      case 'business_profile':
        if (!attr.sourceKey) {
          errors.push(`${attrName}: Missing sourceKey for ${attr.sourceType} source type`)
        }
        break
      case 'static':
        if (!attr.staticValue) {
          warnings.push(`${attrName}: Missing staticValue for static source type`)
        }
        break
      default:
        errors.push(`${attrName}: Unknown sourceType '${attr.sourceType}'`)
    }
  }

  // Check for unused attributes (attributes in templateHtml but not in templateTexts)
  if (templateHtml) {
    const usedAttributes = new Set()
    const attributeRegex = /\{\{([^}]+)\}\}/g
    let match
    while ((match = attributeRegex.exec(templateHtml)) !== null) {
      usedAttributes.add(match[1].trim())
    }

    const definedAttributes = new Set(templateTexts.map(t => t.attributeName).filter(Boolean))
    
    for (const usedAttr of usedAttributes) {
      if (!definedAttributes.has(usedAttr)) {
        warnings.push(`Attribute '${usedAttr}' is used in template but not defined in templateTexts`)
      }
    }

    for (const definedAttr of definedAttributes) {
      if (!usedAttributes.has(definedAttr)) {
        warnings.push(`Attribute '${definedAttr}' is defined in templateTexts but not used in templateHtml`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
