function findRequestChange(fieldName, fieldReviewDecisions, matchPrefix = false) {
  if (!fieldReviewDecisions) return null
  return Object.keys(fieldReviewDecisions).find((key) => {
    const matches = matchPrefix
      ? key.startsWith(fieldName) || key.endsWith(`.${fieldName}`)
      : key.endsWith(`.${fieldName}`) || key === fieldName
    return matches && fieldReviewDecisions[key]?.status === 'request_changes'
  })
}

export function getRequestChangeReason(fieldName, field, fieldReviewDecisions) {
  const isAddressField = field?.type === 'address' || field?.type === 'address_alaminos'
  if (isAddressField) {
    const addressKey = findRequestChange(fieldName, fieldReviewDecisions, true)
    if (addressKey) {
      return fieldReviewDecisions[addressKey]?.requestOther || fieldReviewDecisions[addressKey]?.requestCode
    }
  }
  const key = findRequestChange(fieldName, fieldReviewDecisions, false)
  if (key) {
    return fieldReviewDecisions[key]?.requestOther || fieldReviewDecisions[key]?.requestCode
  }
  return null
}

export function useRequestChangeStyle({ field, fieldName, fieldReviewDecisions, token }) {
  const reason = getRequestChangeReason(fieldName, field, fieldReviewDecisions)
  const showRequestChange = Boolean(reason)

  const border = {
    border: `1px dashed ${token.colorVolcano}`,
    padding: '12px',
    borderRadius: '8px',
  }

  const requestChangeStyle = showRequestChange
    ? { ...border, marginBottom: 0 }
    : { marginBottom: 0 }

  const requestChangeBorder = showRequestChange ? border : {}

  const textareaStyle = showRequestChange
    ? { ...border, marginBottom: 0 }
    : { marginBottom: 0, paddingBottom: '8px' }

  const optionMetadata =
    field?.type === 'category_upload' &&
    Array.isArray(field?.dropdownOptions) &&
    field.dropdownOptions.some((option) =>
      Array.isArray(option?.metadataFields) && option.metadataFields.length > 0
    )
  const hasMetadata =
    (Array.isArray(field?.metadataFields) && field.metadataFields.length > 0) || optionMetadata
  const metadataBoxStyle = showRequestChange
    ? border
    : hasMetadata
      ? { border: `1px solid ${token.colorBorder}`, padding: '12px', borderRadius: '8px' }
      : {}

  return {
    showRequestChange,
    reason,
    requestChangeStyle,
    requestChangeBorder,
    textareaStyle,
    metadataBoxStyle,
  }
}
